import { Message } from '../../interfaces';

export const extractMessageInfo = (
  message: Message,
  previousMessage: Message | undefined,
  csaTitleVisible: boolean,
  csaNameVisible: boolean,
): { author: string; message: string; date: string } => {
  const author = extractAuthor(message, csaTitleVisible, csaNameVisible);

  const date = new Date(message.created).toLocaleDateString('et-EE');
  const time = new Date(message.created).toLocaleTimeString('et-EE', {
    timeZone: 'Europe/Tallinn',
  });

  const content = message.content ? tryUnescape(message.content) : message.content;

  let messageContent = '-';
  if (content) messageContent = extractContent(message, previousMessage, content);
  else if (message.buttons) messageContent = extractButtons(message.buttons);
  else if (message.event) messageContent = extractEvent(message);

  return {
    author,
    message: messageContent,
    date: `${time} ${date}`,
  };
};

const extractAuthor = (message: Message, csaTitleVisible: boolean, csaNameVisible: boolean): string => {
  const { authorRole, authorFirstName, authorLastName, csaTitle } = message;
  if (authorRole === 'end-user') return 'Klient';
  if (authorRole === 'buerokratt' || authorRole === 'chatbot') return 'Bürokratt';
  if (authorRole === 'backoffice-user') {
    const name = `${authorFirstName || ''} ${authorLastName || ''}`.trim();
    const title = csaTitle || authorRole;
    const titleAndName = (name + ' ' + title).trim();
    if (csaTitleVisible && csaNameVisible && titleAndName) return titleAndName;
    else if (csaTitleVisible && title) return title;
    else if (csaNameVisible && name) return name;
    else return 'Klienditeenindaja';
  }
  return authorRole || '';
};

const tryUnescape = (content: string): string => {
  try {
    return decodeURIComponent(content);
  } catch (error) {
    console.error('Failed to decode content:', error);
    return content;
  }
};

const extractContent = (message: Message, previousMessage: Message | undefined, content: string): string => {
  if (previousMessage?.buttons && previousMessage?.authorRole !== 'end-user' && message.authorRole === 'end-user') {
    try {
      const buttons = JSON.parse(previousMessage.buttons) as Array<{
        payload: string;
        title: string;
      }>;
      const selectedButton = buttons.find((button) => button.payload === message.content);
      return selectedButton?.title ?? content;
    } catch {
      return content;
    }
  }
  return content;
};

const extractEvent = (message: Message): string => {
  const translatedEvent = translateEvent(message.event || '');
  if (!translatedEvent) {
    return translatedEvent;
  }
  return `${translatedEvent}`;
};

const extractButtons = (buttons: string): string => {
  try {
    return (
      'Valige üks järgmistest valikutest: ' +
      (JSON.parse(buttons) as Array<{ title: string }>).map((button) => button.title).join(', ')
    );
  } catch {
    return 'Valige üks järgmistest valikutest: -';
  }
};

const translateEvent = (event: string): string => {
  const eventTranslations: Record<string, string> = {
    answered: 'Vastatud',
    terminated: 'Määramata',
    sent_to_csa_email: 'Vestlus saadetud klienditeenindaja e-mailile',
    'client-left': 'Klient lahkus',
    client_left_with_accepted: 'Klient lahkus aktsepteeritud vastusega',
    client_left_with_no_resolution: 'Klient lahkus vastuseta',
    client_left_for_unknown_reasons: 'Klient lahkus määramata põhjustel',
    accepted: 'Aktsepteeritud',
    hate_speech: 'Vihakõne',
    other: 'Muud põhjused',
    response_sent_to_client_email: 'Kliendile vastati tema jäetud kontaktile',
    greeting: 'Tervitus',
    'requested-authentication': 'Küsiti autentimist',
    authentication_successful: 'Autoriseerimine oli edukas',
    authentication_failed: 'Autoriseerimine ei olnud edukas',
    'ask-permission': 'Küsiti nõusolekut',
    'ask-permission-accepted': 'Nõusolek aktsepteeritud',
    'ask-permission-rejected': 'Nõusolek tagasi lükatud',
    'ask-permission-ignored': 'Nõusolek ignoreeritud',
    rating: 'Hinnang',
    'contact-information': 'Küsiti kontakti infot',
    'contact-information-rejected': 'Kontakti info tagasi lükatud',
    'contact-information-fulfilled': 'Kontakti info täidetud',
    'requested-chat-forward': 'Küsiti vestluse suunamist',
    'requested-chat-forward-accepted': 'Vestluse suunamine aktsepteeritud',
    'requested-chat-forward-rejected': 'Vestluse suunamine tagasi lükatud',
    'inactive-chat-ended': 'Lõpetatud tegevusetuse tõttu',
    'message-read': 'Loetud',
    'contact-information-skipped': 'Kontaktandmeid pole esitatud',
    'unavailable-contact-information-fulfilled': 'Kontaktandmed on antud',
    unavailable_organization: 'Organisatsioon pole saadaval',
    unavailable_csas: 'CSA-d pole saadaval',
    unavailable_holiday: 'Puhkus',
    ask_to_forward_to_csa: 'Paluti vestlus klienditeenindajale üle kanda',
    forwarded_to_backoffice: 'Vestlus suunatakse tagasi kontorisse',
    'taken-over': 'Klienditeenindaja võttis vestluse üle',
    continue_chatting_with_bot: 'Jätkake vestlust bürokrattiga',
    unavailable_holiday_ask_contacts: 'Puhkus ja küsiti kontakte',
    'pending-assigned': 'määratud kontaktkasutajale',
    'user-reached': 'võttis kasutajaga ühendust',
    'user-not-reached': 'ei saanud kasutajaga ühendust',
    'user-authenticated': 'on autenditud',
    read: 'Loetud',
  };
  return eventTranslations[event.toLowerCase()] ?? event;
};
