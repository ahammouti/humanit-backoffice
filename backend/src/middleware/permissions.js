const ROLE_RANK = { benevole: 0, tresorier: 1, admin: 2 };

export const requireRole = (minRole) => (req, res, next) => {
  const userRank = ROLE_RANK[req.user?.role] ?? -1;
  const requiredRank = ROLE_RANK[minRole] ?? 99;
  if (userRank < requiredRank) {
    return res.status(403).json({ error: 'Permission insuffisante' });
  }
  next();
};
