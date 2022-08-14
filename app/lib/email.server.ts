import nodemailer from "nodemailer";
import invariant from "tiny-invariant";

invariant(process.env.AWS_ACCESS_KEY_ID, "AWS_ACCESS_KEY_ID is required");
invariant(
  process.env.AWS_SECRET_ACCESS_KEY,
  "AWS_SECRET_ACCESS_KEY is required"
);
invariant(process.env.SMTP_HOST, "SMTP_HOST is required");

const transporter = nodemailer.createTransport({
  port: 465,
  host: process.env.SMTP_HOST,
  secure: true,
  auth: {
    user: process.env.AWS_ACCESS_KEY_ID,
    pass: process.env.AWS_SECRET_ACCESS_KEY,
  },
  debug: true,
});

const generateEmail = (text: string) => `
  <div style="
    padding: 20px;
    font-family: sans-serif;
    line-height: 2;
    font-size: 20px;
  ">
    <h3>Homer Family Cookbook</h3>
    <p>(Link expires in 1 hour)</p>
    <p>${text}</p>
  </div>
`;

invariant(process.env.EMAIL_SENDER, "EMAIL_SENDER is required");
invariant(process.env.APP_BASE_URL, "APP_BASE_URL is required");

export async function sendResetTokenEmail(email: string, token: string) {
  const mailOptions = {
    from: process.env.EMAIL_SENDER,
    to: email, // todo -- get production access
    // to: "success@simulator.amazonses.com", // for testing
    subject: "Password Reset Token - Homer Family Cookbook",
    html: generateEmail(`
      \n\n
      <a href="${process.env.APP_BASE_URL}/reset-password?token=${token}&email=${email}">Click here to reset your password</a>`),
  };

  await transporter.sendMail(mailOptions);
}
