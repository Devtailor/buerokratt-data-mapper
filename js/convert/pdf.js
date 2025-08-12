import { extractMessageInfo } from '../util/pdfs.js';

export const generateMessagesTable = (template, messages, csaTitleVisible, csaNameVisible) => {
  let _html = `<tr class="header">
                  <th style="text-align: left">Autor</th>
                  <th style="padding:0 50px; text-align: left">Sõnum</th>
                  <th style="text-align: left">Aeg</th>
              </tr>`;

  for (const [i, element] of messages.entries()) {
    const previousMessage = i > 0 ? messages[i - 1] : null;

    const { author, message, date } = extractMessageInfo(element, previousMessage, csaTitleVisible, csaNameVisible);

    _html += `<tr>
            <td style="border-bottom:1px solid lightgray">${author}</td>
            <td style="padding:0 50px; border-bottom:1px solid lightgray">${message}</td>
            <td style="border-bottom:1px solid lightgray; width: 140px;">${date}</td>
        </tr>`;
  }

  return template.replace('{{{table}}}', _html);
};
