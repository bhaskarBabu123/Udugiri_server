const sendSuccess = (res, message, data = null, statusCode = 200, meta = null) => {
  const response = { success: true, message };
  if (data !== null) response.data = data;
  if (meta) response.meta = meta;
  return res.status(statusCode).json(response);
};

const sendError = (res, message, statusCode = 500, errors = null) => {
  const response = { success: false, message };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

const sendPaginated = (res, message, data, total, page, limit) => {
  return res.status(200).json({
    success: true,
    message,
    data,
    meta: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
  });
};

module.exports = { sendSuccess, sendError, sendPaginated };
