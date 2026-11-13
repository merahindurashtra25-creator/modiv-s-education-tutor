const { admin, db } = require('./_firebase');
const { verifyAuth, checkCsrf } = require('./_auth');

module.exports = async function handler(req, res) {
  if (!checkCsrf(req)) {
    return res.status(403).json({ error: 'CSRF validation failed' });
  }

  // 1. GET Tutors
  if (req.method === 'GET') {
    const { id, slug, city, subject, limit = 50 } = req.query;

    if (id) {
      const doc = await db.collection('tutors').doc(String(id)).get();
      if (!doc.exists) return res.status(404).json({ error: 'Tutor not found' });
      return res.status(200).json({ tutor: { id: doc.id, ...doc.data() } });
    }

    if (slug) {
      const snap = await db.collection('tutors').where('slug', '==', String(slug)).limit(1).get();
      if (snap.empty) {
        // Fallback check by displayId or doc id
        const idSnap = await db.collection('tutors').where('displayId', '==', String(slug).toUpperCase()).limit(1).get();
        if (idSnap.empty) return res.status(404).json({ error: 'Tutor not found' });
        return res.status(200).json({ tutor: { id: idSnap.docs[0].id, ...idSnap.docs[0].data() } });
      }
      return res.status(200).json({ tutor: { id: snap.docs[0].id, ...snap.docs[0].data() } });
    }

    let query = db.collection('tutors');
    if (city) query = query.where('city', '==', String(city).trim());

    const snap = await query.limit(Math.min(Number(limit) || 50, 100)).get();
    const tutors = [];
    snap.forEach(doc => {
      const d = doc.data();
      // Mask any private verification IDs if caller is not an admin
      tutors.push({
        id: doc.id,
        name: d.name,
        displayId: d.displayId || d.tutId || '',
        tutId: d.tutId || d.displayId || '',
        slug: d.slug || '',
        city: d.city || '',
        area: d.area || '',
        subjects: d.subjects || [],
        classes: d.classes || [],
        experience: d.experience || '',
        rate: d.rate || '',
        rating: d.rating || 5.0,
        reviewsCount: d.reviewsCount || 0,
        photo: d.photo || '',
        bio: d.bio || '',
        verified: Boolean(d.verified || d.status === 'approved')
      });
    });

    return res.status(200).json({ tutors });
  }

  // 2. POST Tutor Profile Update (Requires authenticated tutor or admin)
  if (req.method === 'POST') {
    const user = await verifyAuth(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    const targetEmail = (user.isAdmin && req.body.tutorEmail) ? req.body.tutorEmail : user.email;
    const tutorDocId = `t_user_${targetEmail.replace(/[^a-z0-9]/gi, '_')}`;

    const updateData = { ...req.body };
    delete updateData.tutId;
    delete updateData.displayId;
    delete updateData.email;
    updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await db.collection('tutors').doc(tutorDocId).set(updateData, { merge: true });
    return res.status(200).json({ success: true, message: 'Profile updated' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

