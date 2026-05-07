const JobMatch = require("../models/JobMatch");
const Job = require("../models/Job");
const Student = require("../models/Student");

const calculateSkillScore = (studentSkills = [], jobSkills = []) => {
  if (!jobSkills.length) return 50;
  const sSet = new Set(studentSkills.map((s) => s.toLowerCase()));
  const matched = jobSkills.filter((s) => sSet.has(s.toLowerCase())).length;
  return Math.round((matched / jobSkills.length) * 100);
};

const calculateLocationScore = (studentLocations = [], jobLocation = "") => {
  if (!jobLocation) return 50;
  const jLoc = jobLocation.toLowerCase();
  const matched = studentLocations.some((l) => l.toLowerCase().includes(jLoc) || jLoc.includes(l.toLowerCase()));
  return matched ? 100 : 20;
};

const calculateExperienceScore = (studentExp = 0, jobExpRange = {}) => {
  const min = jobExpRange.min || 0;
  const max = jobExpRange.max || 10;
  if (studentExp >= min && studentExp <= max) return 100;
  if (studentExp < min) return Math.max(0, 100 - (min - studentExp) * 20);
  return Math.max(0, 100 - (studentExp - max) * 10);
};

const calculateMatchScore = (student, job) => {
  const skillsScore = calculateSkillScore(student.skills, job.skillsRequired);
  const locationScore = calculateLocationScore(student.preferredLocations, job.location);
  const experienceScore = calculateExperienceScore(student.experienceYears, job.experienceRequired);

  const weights = { skills: 0.5, location: 0.25, experience: 0.25 };
  const matchScore = Math.round(
    skillsScore * weights.skills +
    locationScore * weights.location +
    experienceScore * weights.experience
  );

  return {
    matchScore,
    breakdown: { skillsScore, locationScore, experienceScore, educationScore: 0 },
  };
};

const computeAndStoreMatch = async (studentId, jobId) => {
  const [student, job] = await Promise.all([
    Student.findById(studentId),
    Job.findById(jobId),
  ]);

  if (!student || !job) return null;

  const { matchScore, breakdown } = calculateMatchScore(student, job);

  const match = await JobMatch.findOneAndUpdate(
    { studentId, jobId },
    { matchScore, breakdown, calculatedAt: new Date() },
    { upsert: true, new: true }
  );

  return match;
};

const getRecommendedJobsForStudent = async (studentId, limit = 10) => {
  const student = await Student.findById(studentId);
  if (!student) return [];

  const jobs = await Job.find({
    status: "approved",
    deadline: { $gt: new Date() },
  }).limit(100);

  const scoredJobs = jobs.map((job) => {
    const { matchScore, breakdown } = calculateMatchScore(student, job);
    return { job, matchScore, breakdown };
  });

  scoredJobs.sort((a, b) => b.matchScore - a.matchScore);

  const top = scoredJobs.slice(0, limit);

  await Promise.all(
    top.map(({ job, matchScore, breakdown }) =>
      JobMatch.findOneAndUpdate(
        { studentId, jobId: job._id },
        { matchScore, breakdown, calculatedAt: new Date() },
        { upsert: true, new: true }
      )
    )
  );

  return top.map(({ job, matchScore, breakdown }) => ({
    ...job.toObject(),
    matchScore,
    breakdown,
  }));
};

const getRecommendedCandidatesForJob = async (jobId, limit = 20) => {
  const job = await Job.findById(jobId);
  if (!job) return [];

  const students = await Student.find({ profileCompletion: { $gte: 60 }, resume: { $exists: true } })
    .limit(500);

  const scoredStudents = students.map((student) => {
    const { matchScore, breakdown } = calculateMatchScore(student, job);
    return { student, matchScore, breakdown };
  });

  scoredStudents.sort((a, b) => b.matchScore - a.matchScore);

  return scoredStudents.slice(0, limit).map(({ student, matchScore }) => ({
    studentId: student._id,
    fullName: student.fullName,
    skills: student.skills,
    experienceYears: student.experienceYears,
    profileCompletion: student.profileCompletion,
    matchScore,
  }));
};

module.exports = {
  calculateMatchScore,
  computeAndStoreMatch,
  getRecommendedJobsForStudent,
  getRecommendedCandidatesForJob,
};
