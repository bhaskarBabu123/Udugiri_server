const xlsx = require("xlsx");
const csv = require("csv-parser");
const fs = require("fs");
const User = require("../models/User");
const Student = require("../models/Student");
const Company = require("../models/Company");
const Job = require("../models/Job");
const { sendWelcomeEmail } = require("./emailService");

const parseExcel = (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  return xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
};

const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", reject);
  });
};

const parseFile = async (filePath) => {
  const ext = filePath.split(".").pop().toLowerCase();
  if (ext === "csv") return parseCSV(filePath);
  return parseExcel(filePath);
};

const importStudents = async (filePath, adminId) => {
  const rows = await parseFile(filePath);
  const results = { created: 0, skipped: 0, errors: [] };

  for (const row of rows) {
    const email = (row.email || row.Email || "").toLowerCase().trim();
    if (!email) {
      results.errors.push({ row, reason: "Missing email" });
      continue;
    }

    try {
      const exists = await User.findOne({ email });
      if (exists) {
        results.skipped++;
        continue;
      }

      const user = await User.create({
        email,
        role: "student",
        isImported: true,
        isFirstLogin: true,
        isPasswordCreated: false,
        isApproved: true,
      });

      const student = await Student.create({
        userId: user._id,
        fullName: row.fullName || row.name || row.Name || email.split("@")[0],
        email,
        phone: row.phone || row.Phone || "",
        skills: row.skills
          ? String(row.skills).split(",").map((s) => s.trim().toLowerCase())
          : [],
        isImported: true,
        education: row.course ? { degreeName: row.course } : undefined,
      });

      await User.findByIdAndUpdate(user._id, {
        profileRef: student._id,
        profileModel: "Student",
      });

      await sendWelcomeEmail(email, student.fullName, "student");
      results.created++;
    } catch (err) {
      results.errors.push({ row, reason: err.message });
    }
  }

  fs.unlinkSync(filePath);
  return results;
};

const importCompanies = async (filePath, adminId) => {
  const rows = await parseFile(filePath);
  const results = { created: 0, skipped: 0, errors: [] };

  for (const row of rows) {
    const email = (row.email || row.Email || "").toLowerCase().trim();
    const companyName = row.companyName || row.company || row.Company || "";

    if (!email || !companyName) {
      results.errors.push({ row, reason: "Missing email or company name" });
      continue;
    }

    try {
      const exists = await User.findOne({ email });
      if (exists) {
        results.skipped++;
        continue;
      }

      const user = await User.create({
        email,
        role: "company",
        isImported: true,
        isFirstLogin: true,
        isPasswordCreated: false,
        isApproved: false,
      });

      const company = await Company.create({
        userId: user._id,
        companyName,
        email,
        phone: row.phone || row.Phone || "",
        isImported: true,
      });

      await User.findByIdAndUpdate(user._id, {
        profileRef: company._id,
        profileModel: "Company",
      });

      results.created++;
    } catch (err) {
      results.errors.push({ row, reason: err.message });
    }
  }

  fs.unlinkSync(filePath);
  return results;
};

const importJobs = async (filePath, adminId) => {
  const rows = await parseFile(filePath);
  const results = { created: 0, skipped: 0, errors: [] };

  for (const row of rows) {
    const title = row.title || row.Title || "";
    const companyEmail = (row.companyEmail || row.email || "").toLowerCase().trim();

    if (!title) {
      results.errors.push({ row, reason: "Missing job title" });
      continue;
    }

    try {
      const companyUser = companyEmail ? await User.findOne({ email: companyEmail, role: "company" }) : null;
      const company = companyUser
        ? await Company.findOne({ userId: companyUser._id })
        : null;

      await Job.create({
        title,
        description: row.description || row.Description || title,
        companyId: company ? company._id : null,
        postedBy: adminId,
        skillsRequired: row.skills
          ? String(row.skills).split(",").map((s) => s.trim().toLowerCase())
          : [],
        location: row.location || row.Location || "",
        status: "approved",
        isImported: true,
      });

      results.created++;
    } catch (err) {
      results.errors.push({ row, reason: err.message });
    }
  }

  fs.unlinkSync(filePath);
  return results;
};

module.exports = { importStudents, importCompanies, importJobs, parseFile };
