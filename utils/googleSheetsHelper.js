// utils/googleSheetsHelper.js
const { google } = require("googleapis");

function getAuthClientFromEnv() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    console.error("Missing GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY in .env");
    return null;
  }

  // Normalize escaped newlines
  privateKey = privateKey.replace(/\\n/g, "\n");

  const scopes = ["https://www.googleapis.com/auth/spreadsheets"];
  return new google.auth.JWT(clientEmail, null, privateKey, scopes);
}

function formatDateTimeIST(date = new Date()) {
  const d = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  const t = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);

  return { date: d, time: t };
}

async function getNextSerialNumber(sheets, spreadsheetId, tabName) {
  try {
    const range = `'${tabName}'!A1:A`;
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const rows = res.data.values || [];

    const firstCell = rows[0]?.[0]?.toString().trim().toLowerCase();
    const hasHeader = firstCell === "no" || isNaN(Number(firstCell));
    const dataCount = hasHeader ? rows.length - 1 : rows.length;

    const nextSerial = dataCount + 1;
    return nextSerial;
  } catch (error) {
    console.error("Error fetching next serial number:", error.message);
    return 1;
  }
}

async function appendPaymentRow({
  name,
  mobile,
  email,
  amount,
  paymentId,
  status,
  dateStr,
  timeStr,
  method,
  product,
}) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  const tabName = process.env.GOOGLE_SHEETS_TAB_NAME || "Sheet1";

  if (!spreadsheetId) {
    console.error("Missing GOOGLE_SHEETS_ID in .env");
    return false;
  }

  const auth = getAuthClientFromEnv();
  if (!auth) {
    console.error("Google Sheets auth client unavailable.");
    return false;
  }

  const sheets = google.sheets({ version: "v4", auth });

  try {
    const serial = await getNextSerialNumber(sheets, spreadsheetId, tabName);
    const { date, time } = formatDateTimeIST();
    const finalDate = dateStr || date;
    const finalTime = timeStr || time;

    const values = [
      [
        serial,
        name,
        mobile,
        email,
        amount,
        paymentId,
        status,
        finalDate,
        finalTime,
        method,
        product || "",
      ],
    ];

    console.log("Appending row:", values);

    const result = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${tabName}'!A:K`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });

    console.log("Append result:", result.statusText);
    return true;
  } catch (error) {
    console.error("Error appending row to Google Sheets:", error.message);
    return false;
  }
}

module.exports = { appendPaymentRow };
