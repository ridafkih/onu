import { Request, Response } from "express";

export default interface AppRoute {
  name: string;
  path: string;
  method: "get" | "post";
  handler: (request: Request, response: Response) => void;
}
