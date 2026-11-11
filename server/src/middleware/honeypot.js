/**
 * Spam honeypot for public POST forms: if the hidden `website` field is non-empty, answer 201 with
 * a plausible fake success body from `fakeBody(req)` and store nothing. Runs before validation so
 * bots learn nothing from validation errors.
 */
export function honeypot(fakeBody) {
  return (req, res, next) => {
    const trap = req.body?.website;
    if (trap !== undefined && trap !== null && String(trap).trim() !== '') {
      return res.status(201).json(fakeBody(req));
    }
    next();
  };
}
