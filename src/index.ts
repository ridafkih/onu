import { app, servers } from "@/modules/app";
import { io } from "@/modules/socket";
import { attachServersToSocket } from "@/utils/socket";

attachServersToSocket(io, ...Object.values(servers));

app;
