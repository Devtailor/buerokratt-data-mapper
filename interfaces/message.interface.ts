export interface Message {
  created: string;
  content?: string;
  buttons?: string;
  event?: string;
  authorRole?: string;
  authorFirstName?: string;
  authorLastName?: string;
  csaTitle?: string;
}
