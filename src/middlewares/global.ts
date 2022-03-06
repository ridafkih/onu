import path from "path";
import express from "express";
import AppMiddleware from "@/@types/AppMiddleware";

export default [
  express.static(path.join(__dirname, "src", "public")),
] as AppMiddleware[];
