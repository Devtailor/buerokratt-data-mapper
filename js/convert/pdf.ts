import Handlebars from 'handlebars';

import { Message } from '../../interfaces';
import { extractMessageInfo } from '../util';

export const generateMessagesTable = (
  template: string,
  messages: Message[],
  csaTitleVisible: boolean,
  csaNameVisible: boolean,
): string => {
  const processedMessages = messages.map((element, i) => {
    const previousMessage = i > 0 ? messages[i - 1] : undefined;
    const { author, message, date } = extractMessageInfo(element, previousMessage, csaTitleVisible, csaNameVisible);

    return {
      author: Handlebars.Utils.escapeExpression(author),
      message: Handlebars.Utils.escapeExpression(message),
      date: Handlebars.Utils.escapeExpression(date),
    };
  });

  const compiledTemplate = Handlebars.compile(template);
  return compiledTemplate({ messages: processedMessages });
};
