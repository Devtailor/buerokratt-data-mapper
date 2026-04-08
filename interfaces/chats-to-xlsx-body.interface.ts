export interface ChatsToXlsxBody {
  chatMessages: ChatMessage[];
  chatHeaders: string[];
  chatRows: (string | number | null)[][] | Record<string, any>[];
  chatIds: string[];
  chatColumnIds?: string[];
  language?: string;
}

export interface ChatMessage {
  chatId: string;
  content: string;
  event: string;
  created: string;
  authorRole: string;
  authorFirstName: string;
  authorLastName: string;
  authorFullName: string;
  csaTitle: string | null;
  buttons: string | null;
  options: string | null;
}
