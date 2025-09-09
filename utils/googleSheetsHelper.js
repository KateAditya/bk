const { google } = require("googleapis");
const fs = require("fs");

function getAuthClientFromEnv() {
  console.log("Getting Google Sheets auth client...");

  const jsonFile = process.env.GOOGLE_SERVICE_ACCOUNT_FILE;
  if (jsonFile && fs.existsSync(jsonFile)) {
    console.log("Using service account file from:", jsonFile);
    const raw = fs.readFileSync(jsonFile, "utf8");
    const creds = JSON.parse(raw);
    const scopes = ["https://www.googleapis.com/auth/spreadsheets"];
    return new google.auth.JWT(
      creds.client_email,
      null,
      creds.private_key,
      scopes
    );
  }

  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;
  if (clientEmail && privateKey) {
    console.log(
      "Using client email and private key from environment variables."
    );
    privateKey = privateKey.replace(/\\n/g, "\n");
    const scopes = ["https://www.googleapis.com/auth/spreadsheets"];
    return new google.auth.JWT(clientEmail, null, privateKey, scopes);
  }

  const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (rawJson) {
    console.log("Using full JSON from environment variable.");
    const creds = JSON.parse(rawJson);
    if (creds.private_key && creds.private_key.includes("\\n")) {
      creds.private_key = creds.private_key.replace(/\\n/g, "\n");
    }
    const scopes = ["https://www.googleapis.com/auth/spreadsheets"];
    return new google.auth.JWT(
      creds.client_email,
      null,
      creds.private_key,
      scopes
    );
  }

  console.error("No valid service account credentials found.");
  return null;
}

function formatDateTimeIST(date = new Date()) {
  const options = { timeZone: "Asia/Kolkata", hour12: true };
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
  }).format(date);
  return { date: d, time: t };
}

async function getNextSerialNumber(sheets, spreadsheetId, tabName) {
  try {
    const range = `${tabName}!A1:A`;
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const rows = res.data.values || [];

    const firstCell = rows[0]?.[0]?.toString().trim().toLowerCase();
    const hasHeader = firstCell === "no" || isNaN(Number(firstCell));
    const dataCount = hasHeader ? Math.max(0, rows.length - 1) : rows.length;

    const nextSerial = dataCount + 1;
    console.log("Next serial number:", nextSerial);
    return nextSerial;
  } catch (error) {
    console.error("Error fetching next serial number:", error);
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
    console.error("GOOGLE_SHEETS_ID is missing.");
    return false;
  }

  const auth = getAuthClientFromEnv();
  if (!auth) {
    console.error("Google Sheets auth client is not available.");
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
      range: `${tabName}!A:K`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });

    console.log("Append result:", result.statusText || "Success");
    return true;
  } catch (error) {
    console.error("Error appending row to Google Sheets:", error);
    return false;
  }
}

module.exports = { appendPaymentRow };
