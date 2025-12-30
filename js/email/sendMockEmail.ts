import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

// NOTE: This service is only for testing purposes. Needs to be replaced with actual mail service.

export const sendMockEmail = async (to: string, subject: string, text: string): Promise<void> => {
  console.log(to, subject, text);
  let testAccount = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: true,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  const mailOptions = {
    from: testAccount.user,
    to,
    subject,
    text,
  };

  try {
    const info: SMTPTransport.SentMessageInfo = await transporter.sendMail(mailOptions);
    console.log("Preview URL: " + nodemailer.getTestMessageUrl(info));
  } catch (err) {
    console.error(err);
  }
};
