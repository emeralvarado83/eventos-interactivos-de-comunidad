// Error de regla de negocio: los route handlers lo traducen a un 400 con
// el mensaje para el cliente. Cualquier otro error es un 500.

export class BusinessError extends Error {}
