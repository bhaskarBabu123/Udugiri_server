const mongoose = require("mongoose");

const educationSchema = new mongoose.Schema({
  sslcSchool: String,
  sslcPercentage: Number,
  pucCollege: String,
  pucPercentage: Number,
  degreeCollege: String,
  degreeName: String,
  branch: String,
  cgpa: Number,
  passoutYear: Number,
});

const projectSchema = new mongoose.Schema({
  title: String,
  description: String,
  techStack: [String],
  url: String,
  duration: String,
});

const certificationSchema = new mongoose.Schema({
  name: String,
  issuer: String,
  issueDate: Date,
  expiryDate: Date,
  credentialUrl: String,
});

const internshipSchema = new mongoose.Schema({
  company: String,
  role: String,
  duration: String,
  description: String,
  startDate: Date,
  endDate: Date,
});

const studentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    phone: { type: String, trim: true },
    alternatePhone: String,
    photo: String,
    dob: Date,
    gender: { type: String, enum: ["male", "female", "other", "prefer_not_to_say"] },
    address: String,
    city: String,
    state: String,
    country: { type: String, default: "India" },
    pincode: String,

    resume: String,
    linkedin: String,
    github: String,
    portfolio: String,

    education: educationSchema,
    skills: [{ type: String, lowercase: true, trim: true }],
    projects: [projectSchema],
    certifications: [certificationSchema],
    internships: [internshipSchema],
    experienceYears: { type: Number, default: 0 },
    expectedSalary: Number,
    preferredLocations: [String],
    noticePeriod: { type: String, default: "Immediate" },

    profileCompletion: { type: Number, default: 0, min: 0, max: 100 },
    placementStatus: {
      type: String,
      enum: ["not_placed", "in_process", "placed"],
      default: "not_placed",
      index: true,
    },
    isPlaced: { type: Boolean, default: false },
    placementCompany: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    placementDate: Date,

    savedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }],
    isImported: { type: Boolean, default: false },
  },
  { timestamps: true }
);

studentSchema.index({ skills: 1 });
studentSchema.index({ city: 1, state: 1 });
studentSchema.index({ "education.passoutYear": 1 });

studentSchema.methods.calculateProfileCompletion = function () {
  const fields = [
    "fullName", "email", "phone", "dob", "gender", "address",
    "city", "state", "pincode", "resume", "linkedin",
  ];
  const educationFields = ["degreeName", "branch", "cgpa", "passoutYear"];
  let filled = 0;
  const total = fields.length + educationFields.length + 2;

  fields.forEach((f) => { if (this[f]) filled++; });
  if (this.education) {
    educationFields.forEach((f) => { if (this.education[f]) filled++; });
  }
  if (this.skills && this.skills.length > 0) filled++;
  if (this.projects && this.projects.length > 0) filled++;

  this.profileCompletion = Math.round((filled / total) * 100);
  return this.profileCompletion;
};

module.exports = mongoose.model("Student", studentSchema);
