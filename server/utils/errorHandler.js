import pkg from "express";
const { NextFunction, Request, Response } = pkg;

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.message = message;
    this.name = "ValidationError";
  }
}

export function errorHandler(err, req, res, next) {
  console.error(err);
  if (err instanceof ValidationError) {
    res.status(400).json({ errors: err.message });
    return;
  }
  if (err instanceof Error) {
    res.status(500).json({ errors: err.message });
    return;
  }
  res.status(500).send("Oop, unknow server error");
  return;
}
