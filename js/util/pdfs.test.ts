import { describe, expect, it } from "vitest";

import { extractMessageInfo } from "./pdfs";
import { Message } from "../../interfaces";

describe("extractMessageInfo", () => {
  const baseMessage: Message = {
    created: new Date("2023-01-01T12:34:56Z").toISOString(),
    content: "Hello",
    authorRole: "end-user",
  };

  it("returns correct info for end-user", () => {
    const result = extractMessageInfo(baseMessage, undefined, false, false);
    expect(result.author).toBe("Klient");
    expect(result.message).toBe("Hello");
    expect(result.date).toMatch(/\d{2}:\d{2}:\d{2} \d{1,2}\.\d{1,2}\.\d{4}/);
  });

  it("decodes URI content", () => {
    const msg = { ...baseMessage, content: encodeURIComponent("Tere!") };
    const result = extractMessageInfo(msg, undefined, false, false);
    expect(result.message).toBe("Tere!");
  });

  it("extracts button title if previous message has buttons", () => {
    const prev: Message = {
      created: new Date().toISOString(),
      buttons: JSON.stringify([
        { payload: "foo", title: "Bar" },
        { payload: "baz", title: "Qux" },
      ]),
      authorRole: "buerokratt",
    };
    const msg: Message = { ...baseMessage, content: "foo", authorRole: "end-user" };
    const result = extractMessageInfo(msg, prev, false, false);
    expect(result.message).toBe("Bar");
  });

  it("extracts event if no content/buttons", () => {
    const msg: Message = {
      ...baseMessage,
      content: undefined,
      event: "answered",
    };
    const result = extractMessageInfo(msg, undefined, false, false);
    expect(result.message).toMatch(/Vastatud/);
  });

  it("extracts buttons if no content but has buttons", () => {
    const msg: Message = {
      ...baseMessage,
      content: undefined,
      buttons: JSON.stringify([{ title: "A" }, { title: "B" }]),
    };
    const result = extractMessageInfo(msg, undefined, false, false);
    expect(result.message).toMatch(/Valige üks järgmistest valikutest: A, B/);
  });

  it("returns author for backoffice-user with name and title", () => {
    const msg: Message = {
      ...baseMessage,
      authorRole: "backoffice-user",
      authorFirstName: "Jane",
      authorLastName: "Doe",
      csaTitle: "Specialist",
    };
    const result = extractMessageInfo(msg, undefined, true, true);
    expect(result.author).toBe("Jane Doe Specialist");
  });

  it("returns only title if csaTitleVisible", () => {
    const msg: Message = {
      ...baseMessage,
      authorRole: "backoffice-user",
      csaTitle: "Specialist",
    };
    const result = extractMessageInfo(msg, undefined, true, false);
    expect(result.author).toBe("Specialist");
  });

  it("returns only name if csaNameVisible", () => {
    const msg: Message = {
      ...baseMessage,
      authorRole: "backoffice-user",
      authorFirstName: "Jane",
      authorLastName: "Doe",
    };
    const result = extractMessageInfo(msg, undefined, false, true);
    expect(result.author).toBe("Jane Doe");
  });

  it("returns Klienditeenindaja for backoffice-user with name and title hidden", () => {
    const msg: Message = { ...baseMessage, authorRole: "backoffice-user" };
    const result = extractMessageInfo(msg, undefined, false, false);
    expect(result.author).toBe("Klienditeenindaja");
  });

  it("returns fallback for unknown authorRole", () => {
    const msg: Message = { ...baseMessage, authorRole: "unknown" };
    const result = extractMessageInfo(msg, undefined, false, false);
    expect(result.author).toBe("unknown");
  });
});
