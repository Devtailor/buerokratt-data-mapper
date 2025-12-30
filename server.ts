import crypto from "crypto";
import fs from "fs";
import * as path from "path";

import axios from "axios";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import { create, engine } from "express-handlebars";
import setRateLimit from "express-rate-limit";
import { body, matchedData, validationResult } from "express-validator";
import Papa from "papaparse";

import {
  certificates,
  conversion,
  cron,
  decryption,
  domain,
  encryption,
  files,
  forms,
  merge,
  object,
  ruuter,
  secrets,
  utils,
  validate,
} from "./controllers";
import { Message } from "./interfaces";
import { generateMessagesTable } from "./js/convert";
import { sendMockEmail } from "./js/email";
import { mergeYaml, readFile } from "./js/file";
import { convertHtmlToPdf, generateButtonsList } from "./js/generate";
import { base64ToText, buildContentFilePath, getHeadersMapping, parseBoolean, parseJwt } from "./js/util";
import { requestLoggerMiddleware } from "./lib";
import * as helpers from "./lib/helpers";
import "./watchers/watcher";

dotenv.config();

const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

const hbs = create({ helpers });

const PORT = process.env.PORT || 3000;
const REQUEST_SIZE_LIMIT = "100mb";
const app = express().disable("x-powered-by");
const rateLimit = setRateLimit({
  windowMs: 60 * 1000,
  max: process.env.RATE_LIMIT_PER_MINUTE ? Number(process.env.RATE_LIMIT_PER_MINUTE) : 30,
  message: "Too many requests",
  headers: true,
  statusCode: 429,
});

const startTimestamp = new Date().getTime();
const appName = process.env.APP_NAME || "DataMapper";
const major = process.env.MAJOR || "unknown";
const minor = process.env.MINOR || "unknown";
const patch = process.env.PATCH || "unknown";

app.use(bodyParser.json({ limit: REQUEST_SIZE_LIMIT }));
app.use(bodyParser.text());
app.use(requestLoggerMiddleware({ logger: console.log }));

app.use("/file-manager", files);
app.use("/conversion", conversion);
app.use("/ruuter", ruuter);
app.use("/merge", merge);
app.use("/mergeYaml", mergeYaml);
app.use("/cron", cron);
app.use("/object", object);
app.use("/validate", validate);
app.use("/utils", utils);
app.use("/domain", domain);
app.use("/forms", forms);
app.use("/certificates", certificates);
app.use(express.urlencoded({ limit: REQUEST_SIZE_LIMIT, extended: true }));
app.use(
  "/encryption",
  encryption({
    publicKey: publicKey,
  }),
);
app.use(
  "/decryption",
  decryption({
    privateKey: privateKey,
  }),
);
app.use(express.json({ limit: REQUEST_SIZE_LIMIT }));

const handled =
  (controller: (req: Request, res: Response) => Promise<void> | void) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await controller(req, res);
    } catch (error: any) {
      return next(error.message);
    }
  };

const EXTENSION = process.env.EXTENSION || ".handlebars";

app.engine(
  ".handlebars",
  engine({
    layoutsDir: path.join(__dirname, "views/layouts"),
  }),
);

app.engine(".hbs", hbs.engine);

app.set("views", [path.join(__dirname, "views"), path.join(__dirname, "module")]);

app.use("/secrets", secrets);

app.get(
  "/",
  handled((_req, res): void => {
    res.render(__dirname + "/views/home.handlebars", { title: "Home" });
  }),
);

const handleRender = (req: Request, res: Response, templatePath: string): void => {
  const locals: Record<string, unknown> & { helpers: typeof helpers } = {
    ...req.body,
    helpers,
  };

  res.render(templatePath, locals, (err: Error | null, response: string | undefined) => {
    if (err) console.log("err:", err);
    if (req.get("type") === "csv") {
      res.json({ response });
    } else if (req.get("type") === "json") {
      if (response === undefined) {
        res.json({
          error: `There was an error executing ${templatePath}`,
        });
      } else {
        res.json(JSON.parse(response));
      }
    } else {
      res.send(response);
    }
  });
};

app.post(
  "/hbs/*",
  rateLimit,
  handled((req, res) => {
    const normalizedParams = path.normalize(req.params[0]).replace(/^(\.\.\/|\.\.)+/, "");
    const templatePath = __dirname + "/views/" + normalizedParams + ".handlebars";
    handleRender(req, res, templatePath);
  }),
);

app.post(
  "/:project/hbs/*",
  handled((req, res) => {
    const project = req.params["project"];
    const normalizedParams = path.normalize(req.params[0]).replace(/^(\.\.\/|\.\.)+/, "");
    const templatePath = __dirname + "/module/" + project + "/hbs/" + normalizedParams + EXTENSION;
    handleRender(req, res, templatePath);
  }),
);

app.post(
  "/js/convert/pdf",
  [
    body("messages").isArray().withMessage("messages is required and must be an array"),
    body("csaTitleVisible").isString().withMessage("csaTitleVisible is required and must be a string"),
    body("csaNameVisible").isString().withMessage("csaNameVisible is required and must be a string"),
  ],
  rateLimit,
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const data = matchedData<{
      messages: Message[];
      csaTitleVisible: string;
      csaNameVisible: string;
    }>(req);
    const { messages, csaTitleVisible, csaNameVisible } = data;

    const template = fs.readFileSync(__dirname + "/views/pdf.handlebars").toString();
    const html = generateMessagesTable(template, messages, parseBoolean(csaTitleVisible), parseBoolean(csaNameVisible));
    try {
      res.json({ response: await convertHtmlToPdf(html) });
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ message: "Error generating PDF" });
    }
  },
);

app.post(
  "/generate/buttons-list",
  (
    req: Request<
      {},
      {},
      {
        list: Record<string, any>[];
        service_name: string;
        key: string;
        payload_prefix?: string;
        payload_keys?: string[];
      }
    >,
    res: Response,
  ) => {
    const response = generateButtonsList(
      req.body.list,
      req.body.service_name,
      req.body.key,
      req.body.payload_prefix ?? "",
      req.body.payload_keys ?? [],
    );
    res.status(200).json({ response });
  },
);

app.post(
  "/parse-csv-to-opensearch-data",
  [
    body("file_path").isString().withMessage("file_path is required and must be a string"),
    body("csv_type").isString().optional().withMessage("csv_type must be a string"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { file_path, csv_type } = matchedData(req) as { file_path: string; csv_type?: string };

    const readResult = await readFile(buildContentFilePath(file_path));
    let file = base64ToText(readResult.file);
    const headersMapping = getHeadersMapping(csv_type);

    if (csv_type === "municipalities") {
      file = file.split("\n").slice(1).join("\n");
    }

    const result = Papa.parse(file, {
      skipEmptyLines: true,
      header: true,
      transformHeader: (header: string) => {
        return (headersMapping as Record<string, string>)[header] ?? header;
      },
    });

    let bulkData = "";
    result.data.forEach((item: any) => {
      bulkData += JSON.stringify({ index: {} }) + "\n";
      bulkData += JSON.stringify(item) + "\n";
    });
    res.send(bulkData);
  },
);

app.get("/js/*", rateLimit, (req: Request, res: Response) => {
  const normalizedPath = path.normalize(req.path).replace(/^(\.\.\/|\.\.)+/, "");
  const resolvedPath = path.join(__dirname, "dist", normalizedPath + ".js");
  res.contentType("text/plain").send(fs.readFileSync(resolvedPath).toString());
});

app.post("/js/email/*", async (req: Request<{}, {}, { to: string; subject: string; text: string }>, res: Response) => {
  const { to, subject, text } = req.body;
  try {
    await sendMockEmail(to, subject, text);
    res.contentType("text/plain").send(`email sent to: ${to}`);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.post("/example/post", (req: Request, res: Response) => {
  console.log(`POST endpoint received ${JSON.stringify(req.body)}`);
  res.status(200).json({ message: `received value ${req.body.name}` });
});

app.post(
  // eslint-disable-next-line sonarjs/publicly-writable-directories
  "/tmp/smax-auth",
  [
    body("Login").isString().withMessage("Login is required and must be a string"),
    body("Password").isString().withMessage("Password is required and must be a string"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { Login, Password } = matchedData(req);

    if (!process.env.SMAX_AUTHENTICATION_URL) {
      return res.status(500).json({ error: `SMAX_AUTHENTICATION_URL is not set` });
    }

    try {
      const { data } = await axios.post(
        process.env.SMAX_AUTHENTICATION_URL,
        { Login, Password },
        {
          headers: { "Content-Type": "application/json" },
        },
      );
      res.json({ token: data });
    } catch (error) {
      console.error("Error during SMAX authentication:", error);
      return res.status(401).json({ error: `Unauthorized` });
    }
  },
);

app.post(
  "/extract-smax-email",
  [body("jwtToken").isString().withMessage("jwtToken is required and must be a string")],
  (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { jwtToken } = matchedData(req) as { jwtToken: string };
    const payload = parseJwt(jwtToken);
    if (!payload || !payload.prn) {
      return res.status(400).json({ error: "Invalid JWT or 'prn' property missing" });
    }

    res.json({ email: payload.prn });
  },
);

app.get("/status", (req: Request, res: Response) => res.status(200).send("ok"));

app.get("/healthz", (req: Request, res: Response) => {
  res.status(200).send({
    appName,
    version: `v${major}.${minor}.${patch}`,
    packagingTime: process.env.BUILDTIME,
    appStartTime: startTimestamp,
    serverTime: new Date().getTime(),
  });
});

app.listen(PORT, () => {
  console.log("Nodejs server running on http://localhost:%s", PORT);
});
