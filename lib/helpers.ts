type AnyObject = Record<string, any>;

export function stringToList(str: string, block: { fn: (ctx: { value: string }) => string }): string {
  let out = "";
  if (!str) return "";
  const parts = str.split(",");
  parts.forEach(function (prop, i) {
    out += block.fn({ value: `"${prop}"${i < parts.length - 1 ? "," : ""}` });
  });
  return out;
}

export function getUuid(): string {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))).toString(16),
  );
}

export function lookupConfigs(configurationArray: { key: string; value: string }[], key: string): string {
  for (const element of configurationArray) {
    if (element.key === key) {
      return element.value;
    }
  }
  return "";
}

export function calculateDateDifference(value: { startDate: string; endDate: string; outputType?: string }): number {
  const { startDate, endDate, outputType } = value;
  const sDate = new Date(startDate);
  const eDate = new Date(endDate);
  const timeDifferenceInSeconds = (eDate.getTime() - sDate.getTime()) / 1000;

  switch (outputType?.toLowerCase()) {
    case "years": {
      const differenceInYears = eDate.getFullYear() - sDate.getFullYear();
      return differenceInYears;
    }
    case "months": {
      const differenceInMonths = eDate.getMonth() - sDate.getMonth() + 12 * (eDate.getFullYear() - sDate.getFullYear());
      return differenceInMonths;
    }
    case "hours": {
      const differenceInHours = Math.round(Math.abs(eDate.getTime() - sDate.getTime()) / 36e5);
      return differenceInHours;
    }
    case "minutes": {
      const differenceInMinutes = Math.floor(timeDifferenceInSeconds / 60);
      return differenceInMinutes;
    }
    case "seconds":
      return timeDifferenceInSeconds;
    default: {
      const differenceInDays = Math.round(timeDifferenceInSeconds / (3600 * 24));
      return differenceInDays;
    }
  }
}

export function toJSON(obj: any): string {
  return JSON.stringify(obj);
}

export function escapeQuotes(text: string): string {
  return text.replaceAll('"', '\\"');
}

export function eq(a: any, b: any): boolean {
  return a == b;
}

export function jsonParse(obj: string): any {
  return JSON.parse(obj);
}

export function arrayIsNotEmpty(array: any[]): boolean {
  return Array.isArray(array) && array.length > 0;
}

export function extractSlotKeys(obj: AnyObject): string[] {
  const keys: string[] = [];
  function iterate(o: AnyObject): void {
    for (const key in o) {
      keys.push(key);
    }
  }
  iterate(obj);
  return keys;
}

export function getObjectKeys(obj: AnyObject): string[] {
  return Object.keys(obj);
}

export function snakeToString(name: unknown): unknown {
  if (!name || typeof name !== "string") return name;

  let result = name.replace(/_/g, " ");

  return JSON.stringify(result.charAt(0).toUpperCase() + result.slice(1));
}

export function ne(a: any, b: any): boolean {
  return a !== b;
}

export function valueExists(array: any[], value: any): boolean {
  return array.includes(value);
}

export function removeEntityFromArray(entities: any[], entityName: any): any[] {
  const index = entities.indexOf(entityName);
  if (index > -1) {
    entities.splice(index, 1);
  }
  return entities;
}

export function assign(varName: string, varValue: any, options: any): void {
  if (!options.data.root) {
    options.data.root = {};
  }
  options.data.root[varName] = varValue;
}

export function sortEntities<T extends { name: string }>(entities: T[]): T[] {
  return entities.sort((a, b) => a.name.localeCompare(b.name));
}

export function isInModel(intentTitle: string, intents: { inmodel?: string[] }): boolean {
  const inModelIntents = intents?.inmodel;
  return Array.isArray(inModelIntents) ? inModelIntents.includes(intentTitle) : false;
}

export function findConnectedServiceId(
  intentTitle: string,
  intents: { connections?: { intent: string; service: string }[] },
): string {
  const name = intentTitle?.replace(/_/g, " ");
  const service = intents?.connections?.find((x) => x.intent === name);
  return service?.service ?? "";
}

export function findModifiedAt(
  intentTitle: string,
  intentsModifiedAt: { intent: string; created: string }[],
): string | undefined {
  if (Array.isArray(intentsModifiedAt)) {
    return intentsModifiedAt.find((i) => i.intent === intentTitle)?.created;
  }
}

export function getCount(
  intentTitle: string,
  intents: { count?: { key: string; examples_counts?: { value: number } }[] },
): number {
  const intentCounts = intents.count;
  const intentCount = intentCounts?.find((intent) => intent.key === intentTitle)?.examples_counts?.value;
  return intentCount || 0;
}

export function addStringIfAbsent(input: string, addString: string): string {
  if (input.startsWith(addString)) {
    return input;
  } else {
    return addString + input;
  }
}

export function concatStringIfAbsent(input: string, addString: string): string {
  if (input.endsWith(addString)) {
    return input;
  } else {
    return input + addString;
  }
}

export function findMatchInObject(object: AnyObject, key: string, keyModifier: string): string {
  if (object) {
    const result = object[keyModifier + key];
    return result ? result[0].text : "";
  }
  return "";
}

export function filterArrayByKey<T extends AnyObject>(array: T[], key: string): T[] {
  return array.filter((ar) => ar[key]?.trim() !== "");
}

export function mergeChatCountArrays(
  arr1?: {
    time: string;
    chat_count?: number;
    chatCount?: number;
    long_waiting_time?: number;
    longWaitingTime?: number;
  }[],
  arr2?: {
    time: string;
    chat_count?: number;
    chatCount?: number;
    long_waiting_time?: number;
    longWaitingTime?: number;
  }[],
  arr3?: {
    time: string;
    chat_count?: number;
    chatCount?: number;
    long_waiting_time?: number;
    longWaitingTime?: number;
  }[],
): { time: string; chatCount: number }[] {
  const result = new Map<string, number>();

  function mergeTheArray(arr?: typeof arr1): void {
    if (!arr) return;
    for (const element of arr) {
      const key = element.time;
      let value = element.chat_count || element.chatCount || element.long_waiting_time || element.longWaitingTime || 0;

      if (result.has(key)) {
        value += result.get(key) || 0;
      }

      result.set(key, value);
    }
  }

  mergeTheArray(arr1);
  mergeTheArray(arr2);
  mergeTheArray(arr3);

  return Array.from(result, ([key, value]) => ({ time: key, chatCount: value }));
}

export function notEmpty(value: any, options: { fn: (ctx: any) => any; inverse: (ctx: any) => any }): any {
  if (typeof value === "string" && value.trim() !== "") {
    return options.fn(undefined);
  }
  return options.inverse(undefined);
}

export function isType(type: string, value: any): boolean {
  return typeof value === type;
}

export function filterOutServicesConnectedToIntent(body: {
  connections: { service: string }[];
  services: { serviceId: string }[];
}): { serviceId: string }[] {
  const { connections, services } = body;
  const usedServiceIds = new Set(connections.map((x) => x.service));
  return services.filter((x) => !usedServiceIds.has(x.serviceId));
}

export function extractServiceTriggerName(msg: string): string {
  return msg.split(";")[0].replace("#", "").trim();
}

export function extractServiceTriggerParams(msg: string): string[] {
  let trimmedMsg = msg;
  if (trimmedMsg.endsWith(";")) trimmedMsg = trimmedMsg.slice(0, -1);
  return trimmedMsg
    .split(";")
    .slice(1)
    .map((p) => p.trim());
}

export function isFirstIndex(value: number): boolean {
  return value === 0;
}

export function choose<T>(a: T, b: T): T {
  return a || b;
}

export function ignoreBlacklist(value: string, blacklist?: string[]): string {
  const keywords = value?.split(" ") ?? [];
  for (const k of keywords) {
    if (blacklist?.includes(k)) return "";
  }
  return value;
}

export function getObjectKeyFromObjectArray<T extends AnyObject>(
  array: T[],
  object: string,
  name: string,
  key: string,
): any {
  const resultingObject = array.find((element) => element[object] === name.toString());
  return resultingObject ? resultingObject[key] : undefined;
}

export function formatDataByRole(data: { botMessages: { seosed: any[] }[] }): string {
  const groupedData = data.botMessages.reduce((acc: AnyObject, message: AnyObject) => {
    message.seosed.forEach((person: AnyObject) => {
      const role = person.isiku_roll;
      const fullRole = person.isiku_roll_tekstina;
      const formattedPerson = `${person.eesnimi || ""} ${person.nimi_arinimi || ""} ${
        person.isikukood_registrikood ? `(${person.isikukood_registrikood})` : ""
      }`;

      acc[role] = acc[role] || { fullRole, persons: new Set() };
      acc[role].persons.add(formattedPerson);
    });
    return acc;
  }, {});

  return Object.entries(groupedData).reduce((result, [_, { fullRole, persons }], index, arr) => {
    const personsList = Array.from(persons as Set<string>)
      .map((person) => String(person).trim())
      .join("\n");
    result += `**${fullRole}**:\n${personsList}`;
    if (index !== arr.length - 1) {
      result += "\n\n";
    }
    return result;
  }, "");
}

export function formatDataByContactType(data: { botMessages: { sidevahendid: any[] }[] }): string {
  const contacts = data.botMessages.reduce((acc: AnyObject, message: AnyObject) => {
    message.sidevahendid.forEach((contact: AnyObject) => {
      if (contact.liik === "MOB" || contact.liik === "TEL") {
        acc["Telefon"] = acc["Telefon"] || new Set();
        acc["Telefon"].add(contact.sisu);
      } else if (contact.liik === "EMAIL") {
        acc["E-post"] = acc["E-post"] || new Set();
        acc["E-post"].add(contact.sisu);
      }
    });
    return acc;
  }, {});

  let result = "";
  Object.entries(contacts).forEach(([type, values], index, arr) => {
    const valuesList = Array.from(values as Set<string>).join("\n");
    result += `**${type}**:\n${valuesList}`;
    if (index !== arr.length - 1) {
      result += "\n\n";
    }
  });

  return result.trim();
}

export function formatDataByBusinessRegister(data: { botMessages: { kasusaajad: any[] }[] }): string {
  const groupedData = data.botMessages.reduce((acc: AnyObject, message: AnyObject) => {
    message.kasusaajad.forEach((person: AnyObject) => {
      const role = person.kontrolli_teostamise_viis;
      const fullRole = person.kontrolli_teostamise_viis_tekstina;
      let formattedPerson = `${person.eesnimi || ""} ${person.nimi || ""}`;
      if (person.isikukood) {
        formattedPerson += ` (${person.isikukood})`;
      }
      if (person.aadress_riik_tekstina) {
        formattedPerson += ` (${person.aadress_riik_tekstina})`;
      }

      acc[role] = acc[role] || { fullRole, persons: new Set() };
      acc[role].persons.add(formattedPerson);
    });
    return acc;
  }, {});

  return Object.entries(groupedData).reduce((result, [_, { fullRole, persons }], index, arr) => {
    const personsList = Array.from(persons as Set<string>)
      .map((person) => String(person).trim())
      .join("\n");
    result += `**${fullRole}**:\n${personsList}`;
    if (index !== arr.length - 1) {
      result += "\n\n";
    }
    return result;
  }, "");
}

export function filterConsumerPriceIndexData(data: {
  indicator: string;
  years: AnyObject;
  months: AnyObject;
  value: any[];
}): string {
  const { indicator, years, months, value } = data;
  const firstYear = years ? Object.keys(years)[0] : new Date().getFullYear();
  const title =
    indicator === "previous_year"
      ? `Tarbijahinnaindeks võrreldes ${firstYear}. aastale eelneva aasta sama kuuga\n`
      : "Tarbijahinnaindeksi muutus võrreldes eelmise kuuga\n";
  let result = `#### ${title}`;

  Object.keys(years).forEach((year, yearIndex) => {
    result += `** ${year} **\n`;
    Object.keys(months).forEach((month, index) => {
      const monthCount = yearIndex * Object.keys(months).length + index;
      const translatedMonth = new Date(Date.parse(`${months[month]} ${new Date().getFullYear()}`)).toLocaleString(
        "et-EE",
        { month: "long" },
      );
      result += `${translatedMonth}: ${value[monthCount]}%\n`;
    });

    if (yearIndex < Object.keys(years).length - 1) {
      result += "\n";
    }
  });

  return result;
}

export function formatToReadableNumber(number: string): string {
  return number
    ? parseFloat(number.replace(",", ".")).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "0";
}

export function filterCompanies(companies: { registry_code: string }[]): { registry_code: string }[] {
  return companies.filter(
    (company, index, self) => index === self.findIndex((t) => t.registry_code === company.registry_code),
  );
}

export function formatDateToEstonian(date: string, isVersion2 = false): string {
  const monthMap = [
    "jaanuaril",
    "veebruaaril",
    "märtsil",
    "aprillil",
    "mail",
    "juunil",
    "juulil",
    "augustil",
    "septembril",
    "oktoobril",
    "novembril",
    "detsembril",
  ];

  const monthMapV2 = [
    "Jaanuaris",
    "Veebruaris",
    "Märtsis",
    "Aprillis",
    "Mais",
    "Juunis",
    "Juulis",
    "Augustis",
    "Septembris",
    "Oktoobris",
    "Novembris",
    "Detsembris",
  ];

  const delimiterMatch = /\D/.exec(date);
  const delimiter = delimiterMatch ? delimiterMatch[0] : "-";
  const parts = date.split(delimiter);
  const day = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const year = Number(parts[2]);
  const dateObj = new Date(year, month, day);
  if (!isNaN(dateObj.getTime())) {
    const monthStr = `${dateObj.getDate()}. ${monthMap[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
    const v2Month = monthMapV2[dateObj.getMonth()];
    return isVersion2 === true ? v2Month : monthStr;
  } else {
    return "";
  }
}

export function getISODate(): string {
  return new Date().toISOString();
}

export function formatDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year}`;
}

export function replaceDocs(
  content: string,
  context: { citations?: { url: string; title: string; filepath: string }[] },
): string {
  let replacedContent = content;
  const links: string[] = [];
  const superscriptMap = "⁰¹²³⁴⁵⁶⁷⁸⁹";

  context?.citations?.forEach((citation, index) => {
    const docKey = `[doc${index + 1}]`;
    if (!replacedContent.includes(docKey)) {
      return;
    }

    const linkLabel = String(links.length + 1)
      .split("")
      .map((digit) => superscriptMap[Number(digit)])
      .join("");

    const linkInfo = createLinkInfo(citation, linkLabel);

    if (linkInfo) {
      replacedContent = replacedContent.replaceAll(docKey, `⁽${linkLabel}⁾`);
      links.push(linkInfo);
    } else {
      replacedContent = replacedContent.replaceAll(docKey, "");
    }
  });

  if (links.length > 0) {
    replacedContent += `\n\n${links.join("")}`;
  }

  replacedContent = replacedContent.replaceAll("\n", "\\n").replaceAll('"', '"');

  if (links.length > 0) {
    replacedContent += "\\n\\nViited:\\n" + links.join("\\n");
  }

  return replacedContent;
}

function createLinkInfo(citation: { url: string; title: string; filepath: string }, linkLabel: string): string | null {
  const parsedUrl = tryParseUrlArray(citation.url);
  if (parsedUrl) {
    return `  • ${linkLabel} [${citation.title}](${citation.filepath})\\n- ${parsedUrl}\\n\\n`;
  }

  if (isValidUrl(citation.url)) {
    return `  • ${linkLabel} [${citation.title}](${citation.filepath})\\n- ${citation.url}\\n\\n`;
  }

  if (isValidUrl(citation.filepath)) {
    return `  • ${linkLabel} [${citation.title}](${citation.filepath})`;
  }

  return null;
}

function tryParseUrlArray(url: string): string | undefined {
  try {
    const parsed = JSON.parse(url);
    return Array.isArray(parsed) ? parsed.join("\\n") : undefined;
  } catch {
    return undefined;
  }
}

function isValidUrl(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

export function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export function filterControlCharacters(content: string): string {
  let filteredContent = content.replaceAll("\n", "\\n").replaceAll("\t", "\\t");
  try {
    filteredContent
      .replaceAll("-", "\\-")
      .replaceAll("*", "\\*")
      .replaceAll("~", "\\~")
      .replaceAll("`", "\\`")
      .replaceAll("=", "\\=");
  } catch (error) {
    console.error("Error filtering control characters:", error);
  }
  return filteredContent;
}

export function toArray<T>(input: T | T[]): T[] {
  return Array.isArray(input) ? input : [input];
}

export function isValidIntentName(name: string): boolean {
  // Allows letters (any unicode letter), numbers, and underscores
  // Matches front-end validation with spaces replaced with underscores
  return /^[\p{L}\p{N}_]+$/u.test(name);
}

export function escapeCertificate(cert?: string): string {
  if (!cert) return "";
  return cert.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t");
}
