export function stringToList(str, block) {
  let out = "";
  if (!str) return "";
  const parts = str.split(",");
  parts.forEach(function (prop, i) {
    out += block.fn({ value: `"${prop}"${i < parts.length - 1 ? "," : ""}` });
  });
  return out;
}

export function getUuid() {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16)
  );
}

export function lookupConfigs(configurationArray, key) {
  for (const element of configurationArray) {
    if (element.key === key) {
      return element.value;
    }
  }
  return "";
}

export function calculateDateDifference(value) {
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
      const differenceInMonths =
        eDate.getMonth() -
        sDate.getMonth() +
        12 * (eDate.getFullYear() - sDate.getFullYear());
      return differenceInMonths;
    }
    case "hours": {
      const differenceInHours = Math.round(Math.abs(eDate - sDate) / 36e5);
      return differenceInHours;
    }
    case "minutes": {
      const differenceInMinutes = Math.floor(timeDifferenceInSeconds / 60);
      return differenceInMinutes;
    }
    case "seconds":
      return timeDifferenceInSeconds;
    default: {
      const differenceInDays = Math.round(
        timeDifferenceInSeconds / (3600 * 24)
      );
      return differenceInDays;
    }
  }
}

export function toJSON(obj) {
  return JSON.stringify(obj);
}

export function eq(a, b) {
  return a == b;
}

export function jsonParse(obj) {
  return JSON.parse(obj);
}

export function arrayIsNotEmpty(array) {
  return !(!Array.isArray(array) || !array.length);
}

export function extractSlotKeys(obj) {
  const keys = [];

  function iterate(obj) {
    for (const key in obj) {
      keys.push(key);
    }
  }

  iterate(obj);

  return keys;
}

export function getObjectKeys(obj) {
  return Object.keys(obj);
}

export function ne(a, b) {
  return a !== b;
}

export function valueExists(array, value) {
  return array.includes(value);
}

export function removeEntityFromArray(entities, entityName) {
  const index = entities.indexOf(entityName);
  if (index > -1) {
    entities.splice(index, 1);
  }
  return entities;
}

export function assign(varName, varValue, options) {
  if (!options.data.root) {
    options.data.root = {};
  }
  options.data.root[varName] = varValue;
}

export function sortEntities(entities) {
  return entities.sort((a, b) => a.name.localeCompare(b.name));
}

export function isInModel(intentTitle, intents) {
  const inModelIntents = intents?.inmodel;
  return Array.isArray(inModelIntents)
    ? inModelIntents.includes(intentTitle)
    : false;
}

export function findConnectedServiceId(intentTitle, intents) {
  const name = intentTitle.replace(/_/g, " ");
  const service = intents?.connections.find((x) => x.intent === name);
  return service?.service ?? "";
}

export function findModifiedAt(intentTitle, intentsModifiedAt) {
  if (Array.isArray(intentsModifiedAt)) {
    return intentsModifiedAt.find((i) => i.intent === intentTitle)?.created;
  }
}

export function getCount(intentTitle, intents) {
  const intentCounts = intents.count;
  const intentCount = intentCounts?.find((intent) => intent.key === intentTitle)
    ?.examples_counts?.value;
  return intentCount || 0;
}

export function addStringIfAbsent(input, addString) {
  if (input.startsWith(addString)) {
    return input;
  } else {
    return addString + input;
  }
}

export function concatStringIfAbsent(input, addString) {
  if (input.endsWith(addString)) {
    return input;
  } else {
    return input + addString;
  }
}

export function findMatchInObject(object, key, keyModifier) {
  if (object) {
    const result = object[keyModifier + key];
    return result ? result[0].text : "";
  }
  return "";
}

export function filterArrayByKey(array, key) {
  return array.filter((ar) => ar[key].trim() !== "");
}

export function mergeChatCountArrays(arr1, arr2, arr3) {
  const result = new Map();

  mergeTheArray(arr1);
  mergeTheArray(arr2);
  mergeTheArray(arr3);

  return Array.from(result, ([key, value]) => ({ time: key, chatCount: value }));

  function mergeTheArray(arr) {
    if(!arr) return;
    for (const element of arr) {
      const key = element.time;
      let value = element.chat_count || element.chatCount || element.long_waiting_time || element.longWaitingTime;

      if(result.has(key)) {
        value += result.get(key);
      }

      result.set(key, value);
    }
  }
}

export function notEmpty(value, options) {
  if (typeof value === "string" && value.trim() !== "") {
    return options.fn(this);
  }
  return options.inverse(this);
}

export function isType(type, value) {
  return typeof value === type;
}

export function filterOutServicesConnectedToIntent(body) {
  const { connections, services } = body;
  const usedServiceIds = new Set(connections.map((x) => x.service));
  return services.filter((x) => !usedServiceIds.has(x.serviceId));
}

export function extractServiceTriggerName(msg) {
  return msg.split(";")[0].replace("#", "").trim();
}

export function extractServiceTriggerParams(msg) {
  if (msg.endsWith(";")) msg = msg.substr(0, msg.length - 1);
  return msg
    .split(";")
    .splice(1)
    .map((p) => p.trim());
}

export function isFirstIndex(value) {
  return value === 0;
}

export function choose(a, b) {
  return a || b;
}

export function ignoreBlacklist(value, blacklist) {
  const keyworkds = value?.split(" ") ?? [];
  for (const k of keyworkds) {
    if (blacklist?.includes(k)) return "";
  }
  return value;
}

export function getObjectKeyFromObjectArray(array, object, name, key) {
  const resultingObject = array.find((element) => element[object] === name.toString());
  return resultingObject ? resultingObject[key] : undefined;
}


export function formatDataByRole(data) {
  const groupedData = data.botMessages.reduce((acc, message) => {
    message.seosed.forEach((person) => {
      const role = person.isiku_roll;
      const fullRole = person.isiku_roll_tekstina;
      const formattedPerson = `${person.eesnimi || ""} ${
        person.nimi_arinimi || ""
      } ${
        person.isikukood_registrikood
          ? `(${person.isikukood_registrikood})`
          : ""
      }`;

      acc[role] = acc[role] || { fullRole, persons: new Set() };
      acc[role].persons.add(formattedPerson);
    });
    return acc;
  }, {});

  return Object.entries(groupedData).reduce(
    (result, [_, { fullRole, persons }], index, arr) => {
      result += `**${fullRole}**:\\n${[...persons]
        .map((person) => `${person.trim()}`)
        .join("\\n")}`;
      if (index !== arr.length - 1) {
        result += "\\n\\n";
      }
      return result;
    },
    ""
  );
}

export function formatDataByContactType(data) {
  const contacts = data.botMessages.reduce((acc, message) => {
    message.sidevahendid.forEach((contact) => {
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
    result += `**${type}**:\\n${[...values].join("\\n")}`;
    if (index !== arr.length - 1) {
      result += "\\n\\n";
    }
  });

  return result.trim();
}

export function formatDataByBusinessRegister(data) {
  const groupedData = data.botMessages.reduce((acc, message) => {
    message.kasusaajad.forEach((person) => {
      const role = person.kontrolli_teostamise_viis;
      const fullRole = person.kontrolli_teostamise_viis_tekstina;
      const formattedPerson = `${person.eesnimi || ""} ${person.nimi || ""} ${
        person.isikukood ? `(${person.isikukood})` : ""
      } ${
        person.aadress_riik_tekstina ? `(${person.aadress_riik_tekstina})` : ""
      }`;

      acc[role] = acc[role] || { fullRole, persons: new Set() };
      acc[role].persons.add(formattedPerson);
    });
    return acc;
  }, {});

  return Object.entries(groupedData).reduce(
    (result, [_, { fullRole, persons }], index, arr) => {
      result += `**${fullRole}**:\\n${[...persons]
        .map((person) => `${person.trim()}`)
        .join("\\n")}`;
      if (index !== arr.length - 1) {
        result += "\\n\\n";
      }
      return result;
    },
    ""
  );
}

export function filterConsumerPriceIndexData(data) {
  const { indicator, years, months, value } = data;
  const firstYear = years ? Object.keys(years)[0] : new Date().getFullYear();
  const title =
    indicator === "previous_year"
      ? `Tarbijahinnaindeks võrreldes ${firstYear}. aastale eelneva aasta sama kuuga\\n`
      : "Tarbijahinnaindeksi muutus võrreldes eelmise kuuga\\n";
  let result = `#### ${title}`;

  Object.keys(years).forEach((year, yearIndex) => {
    result += `** ${year} **\\n`;
    Object.keys(months).forEach((month, index) => {
      const monthCount = yearIndex * Object.keys(months).length + index;
      const translatedMonth = new Date(Date.parse(`${months[month]} ${new Date().getFullYear()}`)).toLocaleString('et-EE', {month: 'long'})
      result += `${translatedMonth}: ${value[monthCount]}%\\n`;
    });

    if (yearIndex < Object.keys(years).length - 1) {
      result += "\\n";
    }
  });

  return result;
}

export function formatToReadableNumber(number) {
  return number ? parseFloat(number.replace(",", ".")).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) : "0";
}

export function filterCompanies(companies) {
  return companies.filter(
    (company, index, self) =>
      index === self.findIndex((t) => t.registry_code === company.registry_code)
  );
}

export function formatDateToEstonian(date, isVersion2 = false) {
  const monthMap = [
      "jaanuaril", "veebruaaril", "märtsil", "aprillil", "mail",
      "juunil", "juulil", "augustil", "septembril", "oktoobril",
      "novembril", "detsembril"
    ];
  
    const monthMapV2 = [
      "Jaanuaris", "Veebruaris", "Märtsis", "Aprillis", "Mais",
      "Juunis", "Juulis", "Augustis", "Septembris", "Oktoobris",
      "Novembris", "Detsembris",
    ];  

    const delimiter = date.match(/\D/)[0]
    const parts = date.split(delimiter);
  
    const dateObj = new Date(parts[2], parts[1] - 1, parts[0]);
    if (!isNaN(dateObj)) {
      const month = `${dateObj.getDate()}. ${monthMap[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
      const v2Month = monthMapV2[dateObj.getMonth()];
      return `${isVersion2 === true ? v2Month : month}`;
    } else {
      return '';
    }
}

export function getISODate() {
  return new Date().toISOString();
}

export function formatDate(date) {
  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year}`;
}

export function replaceDocs(content, context) {
  let replacedContent = content;      
  const links = [];
  context?.citations?.forEach((citation, index) => {
    const docKey = `[doc${index + 1}]`;
    if (replacedContent.includes(docKey)) {
      try {
        const parsedUrl = JSON.parse(citation.url).join("\\n");
        let linkLabel = `link${links.length + 1}`;
        replacedContent = replacedContent.replaceAll(docKey,`[${linkLabel}]`);
        links.push(`**${linkLabel}**: ${parsedUrl}`);
      } catch (_) {
        try {
          new URL(citation.url);
          let linkLabel = `link${links.length + 1}`;
          replacedContent = replacedContent.replaceAll(docKey,`[${linkLabel}]`);
          links.push(`**${linkLabel}**: ${citation.url}`);
        } catch (_) {
          replacedContent = replacedContent.replaceAll(docKey, "");
        }
      }
    }
  });
  
  replacedContent = replacedContent.replaceAll("\n", "\\n").replaceAll('"', '\"');
  
  if (links.length > 0) {
    replacedContent += '\\n\\n' + links.join('\\n');
  }

  return replacedContent;
}

export function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export function filterControlCharacters(content) {
  return content.replaceAll("\n", "\\n");
}

export function toArray(input) {
  return Array.isArray(input) ? input : [input];
}

export function getAuthHeader(username, token) {
  const auth = `${username}:${token}`;
  const encodedAuth = Buffer.from(auth).toString("base64");
  return `Basic ${encodedAuth}`;
}
