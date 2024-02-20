import { extractMessageInfo  } from '../util/pdfs.js';

export const generateHTMLTable = (chatHistoryTable, { messages, csaTitleVisible, csaNameVisible }) => {    
  let _html = `<tr class="header">
                  <th style="text-align: left">Autor</th>
                  <th style="padding:0 50px; text-align: left">Sõnum</th>
                  <th style="text-align: left">Aeg</th>
              </tr>`;

  console.log('generateHTMLTable = ', csaTitleVisible, csaNameVisible)
  console.log('rows = ')

  for (let i = 0; i < messages.length; i++) {
    const { author, message, date } = extractMessageInfo(messages[i], csaTitleVisible, csaNameVisible);

    console.log('row number ', i, ' = ', author, message, date)

    _html += `<tr>
            <td style="border-bottom:1px solid lightgray">${author}</td>
            <td style="padding:0 50px; border-bottom:1px solid lightgray">${message}</td>
            <td style="border-bottom:1px solid lightgray; width: 140px;">${date}</td>
        </tr>`;
  }

  chatHistoryTable.innerHTML = _html;
}
