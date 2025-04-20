import nodemailer from "nodemailer";
import logger from "./logger";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.NODEMAILER_EMAIL as string,
    pass: process.env.NODEMAILER_PASS as string,
  },
});

const sendMail = async (email: string, username: string, token: string) => {
  try {
    let mailOptions = {
      from: process.env.NODEMAILER_EMAIL as string,
      to: email,
      subject: "Email verification required",
      html: `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0;">


    <h2 style="color: #333;">Hey ${username},</h2>
    
    <p style="font-size: 16px; color: #555;">Welcome to <strong>Whispr Chat</strong> 🎉</p>
    
    <p style="font-size: 16px; color: #555;">
      We’re thrilled to have you on board. To get started, please verify your email address by clicking the button below:
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="http://localhost:3000/verify-email?token=${token}" 
         style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-size: 16px;">
         Verify Email
      </a>
    </div>

    <p style="font-size: 14px; color: #999;">
      If the button doesn’t work, copy and paste the following link into your browser:
      <br/>
      <a href="http://localhost:3000/verify-email?token=${token}" style="color: #4CAF50;">http://localhost:3000/verify-email?token=${token}</a>
    </p>

    <hr style="margin: 40px 0; border: none; border-top: 1px solid #ddd;" />

    <p style="font-size: 12px; color: #aaa; text-align: center;">
      &copy; ${new Date().getFullYear()} Whispr Chat. All rights reserved.
    </p>
  </div>
`,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        logger.error(error);
      } else {
        logger.info(`Email sent ${info.response}`);
      }
    });
  } catch (error) {
    logger.error(error);
  }
};

export default sendMail;
