import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';

type Rango = { valorminimo: number; valormaximo: number };
type Usuario = {
  id_usuario: number;
  email?: string;
  nombredeusuario?: string;
  contraseña: string;
};
type Campo = {
  id: number;
  id_usuario: number;
  nombre: string;
  id_dispositivo: string;
};
type ValoresPredeterminados = {
  id_campo: number;
  humedad: Rango;
  temperatura: Rango;
  conductividad: Rango;
};
type SensorData = {
  id_dispositivo: string;
  dia_hora: string;
  medidas_tierras: {
    humedad: number;
    temperatura: number;
    conductividad: number;
  };
};
type Notificacion = {
  id: number;
  id_dispositivo: string;
  dia_hora: string;
  variable: string;
  valor: number;
  mensaje: string;
};
type DataByKey = {
  users: Usuario;
  fields: Campo;
  ranges: ValoresPredeterminados;
  readings: SensorData;
  notifications: Notificacion;
};
type DataKey = keyof DataByKey;

const app: express.Express = express();
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.join(__dirname, 'data');
const FILES: Record<DataKey, string> = {
  users: 'usuarios.json',
  fields: 'campos.json',
  ranges: 'valores-predeterminados.json',
  readings: 'sensores.json',
  notifications: 'notificaciones.json'
};

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function readData<K extends DataKey>(key: K): DataByKey[K][] {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, FILES[key]), 'utf8')) as DataByKey[K][];
}

function writeData<K extends DataKey>(key: K, value: DataByKey[K][]): void {
  fs.writeFileSync(path.join(DATA_DIR, FILES[key]), JSON.stringify(value, null, 2));
}

function nextId<T extends object>(items: T[], key: keyof T): number {
  return items.reduce((largest, item) => Math.max(largest, Number(item[key]) || 0), 0) + 1;
}

function requireId(value: unknown, label = 'id_usuario'): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) {
    throw new HttpError(400, `Falta un ${label} válido`);
  }
  return id;
}

function requireUser(id: number): Usuario {
  const user = readData('users').find(item => item.id_usuario === id);
  if (!user) throw new HttpError(404, 'Usuario no encontrado');
  return user;
}

function requireField(id: number, userId: number): Campo {
  const field = readData('fields').find(item => item.id === id && item.id_usuario === userId);
  if (!field) throw new HttpError(404, 'Campo no encontrado');
  return field;
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function sameText(a: unknown, b: unknown): boolean {
  return normalizeText(a).toLocaleLowerCase() === normalizeText(b).toLocaleLowerCase();
}

function makePasswordHash(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function passwordMatches(password: string, stored: string): boolean {
  const [scheme, salt, expectedHex] = String(stored).split('$');
  if (scheme !== 'scrypt' || !salt || !expectedHex) return password === stored;
  const expected = Buffer.from(expectedHex, 'hex');
  const actual = crypto.scryptSync(password, salt, expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function requireRanges(body: Record<string, any>): Record<'humedad' | 'temperatura' | 'conductividad', Rango> {
  const result: Record<'humedad' | 'temperatura' | 'conductividad', Rango> = {
    humedad: { valorminimo: 0, valormaximo: 0 },
    temperatura: { valorminimo: 0, valormaximo: 0 },
    conductividad: { valorminimo: 0, valormaximo: 0 }
  };
  for (const key of ['humedad', 'temperatura', 'conductividad'] as const) {
    const min = Number(body?.[key]?.valorminimo);
    const max = Number(body?.[key]?.valormaximo);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
      throw new HttpError(400, 'Revisá los valores mínimos y máximos');
    }
    result[key] = { valorminimo: min, valormaximo: max };
  }
  return result;
}

function userFields(req: Request): Campo[] {
  return readData('fields').filter(field => field.id_usuario === requireId(req.query.id_usuario));
}

function sensorBelongsToUser(deviceId: string, userId: number): boolean {
  return readData('fields').some(
    field => field.id_dispositivo === deviceId && field.id_usuario === userId
  );
}

app.use(cors({
  origin: /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/
}));
app.use(express.json({ limit: '1mb' }));

app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'EarthGrid Backend funcionando' });
});

app.get('/health', (_req: Request, res: Response) => {
  res.type('text/plain').send('OK');
});

app.post('/api/auth/registro', (req, res) => {
  const email = normalizeText(req.body?.email);
  const nombredeusuario = normalizeText(req.body?.nombredeusuario);
  const contraseña = req.body?.contraseña;
  if ((!email && !nombredeusuario) || typeof contraseña !== 'string' || !contraseña) {
    throw new HttpError(400, 'Completá email, nombre de usuario y contraseña');
  }

  const users = readData('users');
  if (email && users.some(user => sameText(user.email, email))) {
    throw new HttpError(409, 'Email actualmente en uso');
  }
  if (nombredeusuario && users.some(user => sameText(user.nombredeusuario, nombredeusuario))) {
    throw new HttpError(409, 'Nombre de usuario en uso');
  }

  const id = nextId(users, 'id_usuario');
  users.push({
    id_usuario: id,
    email,
    nombredeusuario,
    contraseña: makePasswordHash(contraseña)
  });
  writeData('users', users);
  res.status(201).json({
    success: true,
    message: 'Usuario registrado correctamente',
    id_usuario: id
  });
});

app.post('/api/auth/login', (req, res) => {
  const login = normalizeText(req.body?.email_o_usuario);
  const contraseña = req.body?.contraseña;
  if (!login || typeof contraseña !== 'string' || !contraseña) {
    throw new HttpError(400, 'Completá usuario/email y contraseña');
  }
  const users = readData('users');
  const user = users.find(item =>
    sameText(item.email, login) || sameText(item.nombredeusuario, login)
  );
  if (!user || !passwordMatches(contraseña, user.contraseña)) {
    throw new HttpError(401, 'Email/nombre de usuario o contraseña incorrectos');
  }
  if (!user.contraseña.startsWith('scrypt$')) {
    user.contraseña = makePasswordHash(contraseña);
    writeData('users', users);
  }
  res.json({
    success: true,
    message: 'Inicio de sesión correcto',
    id_usuario: user.id_usuario
  });
});

app.post('/api/auth/logout', (_req, res) => {
  res.json({ success: true, message: 'Sesión cerrada correctamente' });
});

app.get('/api/auth/perfil', (req, res) => {
  const id = requireId(req.query.id_usuario);
  const user = requireUser(id);
  res.json({
    success: true,
    usuario: {
      id_usuario: user.id_usuario,
      email: user.email,
      nombredeusuario: user.nombredeusuario
    }
  });
});

app.put('/api/auth/usuario', (req, res) => {
  const body = req.body || {};
  const id = requireId(body.id_usuario);
  const currentPassword = body.contraseñaActual;
  const { dato, nuevoValor, confirmarValor } = body;
  if (
    typeof currentPassword !== 'string' || !currentPassword ||
    typeof nuevoValor !== 'string' || !nuevoValor.trim() ||
    nuevoValor !== confirmarValor
  ) {
    throw new HttpError(400, 'Completá los datos y verificá que los nuevos valores coincidan');
  }
  if (!['email', 'nombredeusuario', 'contraseña'].includes(dato)) {
    throw new HttpError(400, 'Dato no válido');
  }

  const users = readData('users');
  const user = users.find(item => item.id_usuario === id);
  if (!user) throw new HttpError(404, 'Usuario no encontrado');
  if (!passwordMatches(currentPassword, user.contraseña)) {
    throw new HttpError(401, 'Contraseña incorrecta');
  }
  if (dato !== 'contraseña' && users.some(item =>
    item.id_usuario !== id && sameText(item[dato], nuevoValor)
  )) {
    throw new HttpError(409, 'Ese valor ya está en uso');
  }

  user[dato] = dato === 'contraseña' ? makePasswordHash(nuevoValor) : nuevoValor.trim();
  writeData('users', users);
  res.json({
    success: true,
    message: 'Datos actualizados correctamente',
    usuario: {
      email: user.email,
      nombredeusuario: user.nombredeusuario
    }
  });
});

app.delete('/api/auth/usuario', (req, res) => {
  const id = requireId(req.body?.id_usuario);
  const users = readData('users');
  const user = users.find(item => item.id_usuario === id);
  if (!user) throw new HttpError(404, 'Usuario no encontrado');
  if (!passwordMatches(req.body?.contraseña || '', user.contraseña)) {
    throw new HttpError(401, 'Contraseña incorrecta');
  }

  const removedFields = readData('fields').filter(field => field.id_usuario === id);
  const removedFieldIds = new Set(removedFields.map(field => field.id));
  const removedDevices = new Set(removedFields.map(field => field.id_dispositivo));
  writeData('users', users.filter(item => item.id_usuario !== id));
  writeData('fields', readData('fields').filter(field => field.id_usuario !== id));
  writeData('ranges', readData('ranges').filter(item => !removedFieldIds.has(item.id_campo)));
  writeData('readings', readData('readings').filter(item => !removedDevices.has(item.id_dispositivo)));
  writeData('notifications', readData('notifications').filter(item => !removedDevices.has(item.id_dispositivo)));
  res.json({ success: true, message: 'Usuario y sus datos fueron eliminados' });
});

app.get('/api/campos', (req, res) => {
  const fields = userFields(req);
  res.json({ success: true, cantidad: fields.length, campos: fields });
});

app.post('/api/campos', (req, res) => {
  const body = req.body || {};
  const userId = requireId(body.id_usuario);
  const nombre = normalizeText(body.nombre);
  const id_dispositivo = normalizeText(body.id_dispositivo);
  if (!nombre || !id_dispositivo) throw new HttpError(400, 'Completá el nombre y el ID del sensor');
  const rangos = requireRanges(body);
  requireUser(userId);

  const fields = readData('fields');
  if (fields.some(field => field.id_usuario === userId && sameText(field.nombre, nombre))) {
    throw new HttpError(409, 'Ya existe un campo con ese nombre');
  }
  if (fields.some(field => field.id_dispositivo === id_dispositivo)) {
    throw new HttpError(409, 'Ya existe un campo con ese sensor');
  }
  if (readData('readings').some(reading => reading.id_dispositivo === id_dispositivo)) {
    throw new HttpError(409, 'Ese ID de sensor ya tiene un historial y no se puede volver a usar');
  }

  const field = { id: nextId(fields, 'id'), id_usuario: userId, nombre, id_dispositivo };
  fields.push(field);
  const ranges = readData('ranges');
  ranges.push({ id_campo: field.id, ...rangos });
  writeData('fields', fields);
  writeData('ranges', ranges);
  res.status(201).json({
    success: true,
    message: 'Se ha agregado el campo y sus rangos correctamente',
    campo: field,
    rangos: { id_campo: field.id, ...rangos }
  });
});

app.put('/api/campos/:id', (req, res) => {
  const id = requireId(req.params.id, 'id de campo');
  const userId = requireId(req.query.id_usuario);
  const nombre = normalizeText(req.body?.nombre);
  if (!nombre) throw new HttpError(400, 'Debés ingresar un nombre');
  const fields = readData('fields');
  const field = fields.find(item => item.id === id && item.id_usuario === userId);
  if (!field) throw new HttpError(404, 'Campo no encontrado');
  if (fields.some(item =>
    item.id !== id && item.id_usuario === userId && sameText(item.nombre, nombre)
  )) {
    throw new HttpError(409, 'Ya existe un campo con ese nombre');
  }
  field.nombre = nombre;
  writeData('fields', fields);
  res.json({ success: true, message: 'Campo actualizado correctamente' });
});

app.delete('/api/campos/:id', (req, res) => {
  const id = requireId(req.params.id, 'id de campo');
  const userId = requireId(req.query.id_usuario);
  const fields = readData('fields');
  const field = fields.find(item => item.id === id && item.id_usuario === userId);
  if (!field) throw new HttpError(404, 'Campo no encontrado');

  writeData('fields', fields.filter(item => item.id !== id));
  writeData('ranges', readData('ranges').filter(item => item.id_campo !== id));
  res.json({ success: true, message: 'Campo eliminado correctamente' });
});

app.get('/api/campos/:id/valores-predeterminados', (req, res) => {
  const id = requireId(req.params.id, 'id de campo');
  const userId = requireId(req.query.id_usuario);
  requireField(id, userId);
  const values = readData('ranges').find(item => item.id_campo === id);
  if (!values) throw new HttpError(404, 'Este campo no tiene valores configurados');
  res.json({ success: true, valores: values });
});

app.put('/api/campos/:id/valores-predeterminados', (req, res) => {
  const id = requireId(req.params.id, 'id de campo');
  const userId = requireId(req.query.id_usuario);
  requireField(id, userId);
  const values = { id_campo: id, ...requireRanges(req.body) };
  const allValues = readData('ranges');
  const index = allValues.findIndex(item => item.id_campo === id);
  if (index < 0) allValues.push(values);
  else allValues[index] = values;
  writeData('ranges', allValues);
  res.json({
    success: true,
    message: 'Rangos guardados correctamente',
    nuevosValores: values
  });
});

app.post('/api/sensores/datos', (req, res) => {
  const body = req.body || {};
  const id_dispositivo = normalizeText(body.id_dispositivo);
  const dia_hora = normalizeText(body.dia_hora);
  const measures = body.medidas_tierras || {};
  if (!id_dispositivo || !dia_hora || !Number.isFinite(Date.parse(dia_hora))) {
    throw new HttpError(400, 'Faltan datos válidos del sensor');
  }
  const medidas_tierras: SensorData['medidas_tierras'] = {
    humedad: 0,
    temperatura: 0,
    conductividad: 0
  };
  for (const key of ['humedad', 'temperatura', 'conductividad'] as const) {
    const value = Number(measures[key]);
    if (measures[key] === undefined || !Number.isFinite(value)) {
      throw new HttpError(400, 'Las mediciones deben ser números');
    }
    medidas_tierras[key] = value;
  }
  const field = readData('fields').find(item => item.id_dispositivo === id_dispositivo);
  if (!field) throw new HttpError(404, 'No existe un campo asociado a ese sensor');
  const ranges = readData('ranges').find(item => item.id_campo === field.id);
  if (!ranges) throw new HttpError(500, 'Error en los rangos de valores del campo');

  const reading = { id_dispositivo, dia_hora, medidas_tierras };
  const readings = readData('readings');
  readings.push(reading);
  writeData('readings', readings);

  const notifications = readData('notifications');
  const mensajes: Record<keyof SensorData['medidas_tierras'], Record<'bajo' | 'alto', string>> = {
    humedad: {
      bajo: 'La humedad se encuentra bajo los valores mínimos',
      alto: 'La humedad se encuentra por encima de los valores máximos'
    },
    temperatura: {
      bajo: 'La temperatura se encuentra bajo los valores mínimos',
      alto: 'La temperatura se encuentra por encima de los valores máximos'
    },
    conductividad: {
      bajo: 'La conductividad eléctrica se encuentra bajo los valores mínimos',
      alto: 'La conductividad se encuentra por encima de los valores máximos'
    }
  };
  for (const key of ['humedad', 'temperatura', 'conductividad'] as const) {
    const value = medidas_tierras[key];
    const range = ranges[key];
    const lado = value < range.valorminimo ? 'bajo' : value > range.valormaximo ? 'alto' : null;
    if (lado) {
      notifications.push({
        id: nextId(notifications, 'id'),
        id_dispositivo,
        dia_hora,
        variable: key,
        valor: value,
        mensaje: mensajes[key][lado]
      });
    }
  }
  writeData('notifications', notifications);
  res.status(200).json({
    success: true,
    message: 'Datos recibidos y guardados correctamente',
    dato: reading
  });
});

app.get('/api/sensores/datos', (req, res) => {
  const userId = requireId(req.query.id_usuario);
  const devices = new Set(userFields(req).map(field => field.id_dispositivo));
  const readings = readData('readings').filter(item => devices.has(item.id_dispositivo));
  res.json({ success: true, cantidad: readings.length, datos: readings });
});

app.get('/api/sensores/:id_dispositivo/ultimos-datos', (req, res) => {
  const userId = requireId(req.query.id_usuario);
  const deviceId = req.params.id_dispositivo;
  if (!sensorBelongsToUser(deviceId, userId)) throw new HttpError(404, 'No se encontró el sensor');
  const readings = readData('readings').filter(item => item.id_dispositivo === deviceId);
  const latest = readings[readings.length - 1];
  if (!latest) throw new HttpError(404, 'No hay datos de ese sensor');
  res.json({ success: true, dato: latest });
});

app.get('/api/sensores/:id_dispositivo/datos', (req, res) => {
  const userId = requireId(req.query.id_usuario);
  const deviceId = req.params.id_dispositivo;
  if (!sensorBelongsToUser(deviceId, userId)) throw new HttpError(404, 'No se encontró el sensor');
  const readings = readData('readings').filter(item => item.id_dispositivo === deviceId);
  res.json({ success: true, cantidad: readings.length, datos: readings });
});

app.get('/api/notificaciones', (req, res) => {
  const devices = new Set(userFields(req).map(field => field.id_dispositivo));
  const notifications = readData('notifications').filter(item => devices.has(item.id_dispositivo));
  res.json({ success: true, cantidad: notifications.length, notificaciones: notifications });
});

app.get('/api/sensores/:id_dispositivo/notificaciones', (req, res) => {
  const userId = requireId(req.query.id_usuario);
  const deviceId = req.params.id_dispositivo;
  if (!sensorBelongsToUser(deviceId, userId)) throw new HttpError(404, 'No se encontró el sensor');
  const notifications = readData('notifications').filter(item => item.id_dispositivo === deviceId);
  res.json({ success: true, cantidad: notifications.length, notificaciones: notifications });
});

app.use((err: HttpError, _req: Request, res: Response, _next: NextFunction) => {
  const status = Number.isInteger(err.status) ? err.status : 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    success: false,
    message: status >= 500 ? 'Error interno del servidor' : err.message
  });
});

for (const filename of Object.values(FILES)) {
  const file = path.join(DATA_DIR, filename);
  if (!fs.existsSync(file)) fs.writeFileSync(file, '[]\n');
}

app.listen(PORT, () => {
  console.log(`Servidor EarthGrid funcionando en http://localhost:${PORT}`);
});
