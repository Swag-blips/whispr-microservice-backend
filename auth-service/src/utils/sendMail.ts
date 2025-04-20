import nodemailer from "nodemailer";
import logger from "./logger";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "swaggcod2003@gmail.com",
    pass: "xwzzekkgakohxewk",
  },
});

const sendMail = async (email: string, username: string, token: string) => {
  try {
    let mailOptions = {
      from: "swaggcod2003@gmail.com",
      to: email,
      subject: "Email verification required",
      html: `<h1>Welcome to whispr chat ${username}</h1> <p>Verify your email here <a href="http://localhost:3000/verify-email?token=${token}">Here</a></p>`,
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
