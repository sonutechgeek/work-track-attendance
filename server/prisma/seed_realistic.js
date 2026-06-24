/**
 * WorkTrack — Realistic Data Seed
 * Adds 3 new departments, 3 managers, 9 employees (+ 2 more to Engineering)
 * with 6 months of attendance history, varied leave requests, and proper balances.
 *
 * Run: node prisma/seed_realistic.js
 * Today (seed reference date): 2026-06-24
 */

require('dotenv').config({ path: '.env' });
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── Date helpers (always UTC midnight to avoid IST offset bugs) ──────────────

const d = (y, m, day) => new Date(Date.UTC(y, m - 1, day));

function addDays(date, n) {
  const r = new Date(date);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

function isWeekday(date) {
  const wd = date.getUTCDay();
  return wd >= 1 && wd <= 5;
}

function getWeekdays(start, end) {
  const days = [];
  let cur = new Date(start);
  const endMs = end.getTime();
  while (cur.getTime() <= endMs) {
    if (isWeekday(cur)) days.push(new Date(cur));
    cur = addDays(cur, 1);
  }
  return days;
}

function countWorkingDays(start, end) {
  return getWeekdays(start, end).length;
}

const TODAY = d(2026, 6, 24);

// IST = UTC + 5:30 → 9:00 IST = 03:30 UTC
function makeCheckIn(date, hIst = 9, mIst = 0) {
  const utcH = hIst - 5, utcM = mIst >= 30 ? mIst - 30 : mIst + 30;
  const utcHAdj = mIst >= 30 ? utcH : utcH - 1;
  const r = new Date(date);
  r.setUTCHours(utcHAdj < 0 ? 0 : utcHAdj, utcM, 0, 0);
  return r;
}
function makeCheckOut(date, hIst = 18, mIst = 0) {
  return makeCheckIn(date, hIst, mIst);
}

// ── Leave/Attendance constants ───────────────────────────────────────────────

const LEAVE_TO_ATT_STATUS = {
  CASUAL: 'LEAVE', SICK: 'LEAVE', HALF_DAY: 'HALF_DAY',
  WFH: 'WFH', FIELD_VISIT: 'FIELD_VISIT', EARLY_LEAVE: 'PRESENT',
};

const BALANCE_FIELD = {
  CASUAL:    'casualUsed',
  SICK:      'sickUsed',
  HALF_DAY:  'halfDayUsed',
  WFH:       'wfhUsed',
};

// ── Attendance pattern (deterministic by employee + day index) ───────────────

function getAttPattern(userId, dayIndex) {
  const v = ((userId * 31) + dayIndex) % 20;
  if (v === 0)           return 'ABSENT';
  if (v >= 1 && v <= 3)  return 'WFH';
  if (v >= 4 && v <= 5)  return 'HALF_DAY';
  return 'PRESENT';
}

function makeAttRecord(date, status, userId) {
  if (status === 'ABSENT') return { date, status, checkInTime: null, checkOutTime: null, workingHours: null };
  const minVariant = (userId % 4) * 15; // 0, 15, 30, 45 min variance
  if (status === 'HALF_DAY') {
    const ci = makeCheckIn(date, 9, minVariant);
    const co = makeCheckOut(date, 13, minVariant);
    return { date, status, checkInTime: ci, checkOutTime: co, workingHours: 4.0 };
  }
  if (status === 'WFH') {
    const ci = makeCheckIn(date, 9, minVariant);
    const co = makeCheckOut(date, 17, 30 + minVariant > 59 ? 0 : 30);
    return { date, status, checkInTime: ci, checkOutTime: co, workingHours: 8.5 };
  }
  // PRESENT
  const ci = makeCheckIn(date, 9, minVariant);
  const co = makeCheckOut(date, 18, minVariant);
  const wh = parseFloat(((co.getTime() - ci.getTime()) / 3_600_000).toFixed(2));
  return { date, status, checkInTime: ci, checkOutTime: co, workingHours: wh };
}

// ── Per-user leave definitions ────────────────────────────────────────────────
// Each entry: { type, start, end, duration, reason, status, rejectionComment? }

const USER_LEAVES = {
  'rahul.verma@company.com': [
    { type: 'WFH',    start: d(2026,2,10), end: d(2026,2,10), dur: 1.0, reason: 'Client coordination from home',       status: 'APPROVED' },
    { type: 'CASUAL', start: d(2026,4,18), end: d(2026,4,18), dur: 1.0, reason: 'Bank and government paperwork',       status: 'APPROVED' },
    { type: 'SICK',   start: d(2026,5,26), end: d(2026,5,27), dur: 2.0, reason: 'Viral fever, doctor advised rest',    status: 'APPROVED' },
    { type: 'CASUAL', start: d(2026,6,30), end: d(2026,7,1),  dur: 2.0, reason: 'Family function out of town',        status: 'PENDING' },
  ],
  'priya.sharma@company.com': [
    { type: 'SICK',    start: d(2026,3,5),  end: d(2026,3,6),  dur: 2.0, reason: 'Viral fever and body ache',           status: 'APPROVED' },
    { type: 'WFH',    start: d(2026,4,22), end: d(2026,4,22), dur: 1.0, reason: 'Broadband technician visit at home',  status: 'APPROVED' },
    { type: 'CASUAL', start: d(2026,5,30), end: d(2026,5,30), dur: 1.0, reason: 'Child school admission process',      status: 'APPROVED' },
    { type: 'HALF_DAY', start: d(2026,6,26), end: d(2026,6,26), dur: 0.5, reason: 'Doctor appointment at 2pm',         status: 'PENDING' },
  ],
  'deepak.joshi@company.com': [
    { type: 'CASUAL', start: d(2026,2,14), end: d(2026,2,14), dur: 1.0, reason: 'Personal appointment',                status: 'APPROVED' },
    { type: 'WFH',   start: d(2026,3,24), end: d(2026,3,25), dur: 2.0, reason: 'Remote field coordination',           status: 'APPROVED' },
    { type: 'CASUAL', start: d(2026,4,30), end: d(2026,4,30), dur: 1.0, reason: 'Long weekend travel',                status: 'REJECTED', comment: 'Critical delivery on April 30 — please reschedule' },
    { type: 'SICK',   start: d(2026,6,9),  end: d(2026,6,10), dur: 2.0, reason: 'Severe migraine, on medication',      status: 'APPROVED' },
    { type: 'CASUAL', start: d(2026,7,1),  end: d(2026,7,1),  dur: 1.0, reason: 'Travel for personal event',          status: 'PENDING' },
  ],
  'kavya.reddy@company.com': [
    { type: 'SICK',   start: d(2026,3,17), end: d(2026,3,18), dur: 2.0, reason: 'Cold and fever, doctor visit',        status: 'APPROVED' },
    { type: 'WFH',   start: d(2026,4,8),  end: d(2026,4,8),  dur: 1.0, reason: 'Home appliance repair scheduled',     status: 'APPROVED' },
    { type: 'CASUAL', start: d(2026,5,9),  end: d(2026,5,9),  dur: 1.0, reason: 'Weekend trip extension',             status: 'REJECTED', comment: 'Team headcount constraint on this date' },
    { type: 'CASUAL', start: d(2026,6,4),  end: d(2026,6,5),  dur: 2.0, reason: 'Relative visiting from abroad',       status: 'APPROVED' },
    { type: 'CASUAL', start: d(2026,6,27), end: d(2026,6,27), dur: 1.0, reason: 'Local festival holiday',             status: 'PENDING' },
  ],
  'arjun.kumar@company.com': [
    { type: 'WFH',    start: d(2026,4,7),  end: d(2026,4,7),  dur: 1.0, reason: 'Office network maintenance day',      status: 'APPROVED' },
    { type: 'CASUAL', start: d(2026,5,12), end: d(2026,5,12), dur: 1.0, reason: 'Brother\'s engagement ceremony',      status: 'APPROVED' },
    { type: 'SICK',   start: d(2026,5,29), end: d(2026,5,29), dur: 1.0, reason: 'Food poisoning, unable to commute',   status: 'APPROVED' },
    { type: 'WFH',   start: d(2026,6,25), end: d(2026,6,25), dur: 1.0, reason: 'Client deliverable from home',        status: 'PENDING' },
  ],
  'sneha.patel@company.com': [
    { type: 'WFH',    start: d(2026,4,1),  end: d(2026,4,2),  dur: 2.0, reason: 'Q1 review prep, working from home',   status: 'APPROVED' },
    { type: 'HALF_DAY', start: d(2026,5,22), end: d(2026,5,22), dur: 0.5, reason: 'Dental appointment in afternoon',   status: 'APPROVED' },
    { type: 'SICK',   start: d(2026,6,1),  end: d(2026,6,1),  dur: 1.0, reason: 'Stomach infection',                  status: 'REJECTED', comment: 'Please provide medical certificate and reapply' },
    { type: 'CASUAL', start: d(2026,6,30), end: d(2026,7,2),  dur: 3.0, reason: 'Sister\'s wedding in home town',      status: 'PENDING' },
  ],
  'rohan.mehta@company.com': [
    { type: 'CASUAL', start: d(2026,3,10), end: d(2026,3,10), dur: 1.0, reason: 'Bank account and KYC update',          status: 'APPROVED' },
    { type: 'SICK',   start: d(2026,4,14), end: d(2026,4,15), dur: 2.0, reason: 'Severe migraine and vertigo',          status: 'APPROVED' },
    { type: 'WFH',   start: d(2026,6,3),  end: d(2026,6,3),  dur: 1.0, reason: 'Quarterly close work from home',       status: 'APPROVED' },
    { type: 'CASUAL', start: d(2026,6,26), end: d(2026,6,26), dur: 1.0, reason: 'Parent-teacher meeting at school',    status: 'PENDING' },
  ],
  'neha.gupta@company.com': [
    { type: 'WFH',    start: d(2026,4,21), end: d(2026,4,22), dur: 2.0, reason: 'Home renovation work in progress',     status: 'APPROVED' },
    { type: 'CASUAL', start: d(2026,5,23), end: d(2026,5,23), dur: 1.0, reason: 'Personal legal documentation',        status: 'APPROVED' },
    { type: 'SICK',   start: d(2026,6,25), end: d(2026,6,25), dur: 1.0, reason: 'Fever and body ache since morning',    status: 'PENDING' },
  ],
  'vikas.singh@company.com': [
    { type: 'WFH',    start: d(2026,4,28), end: d(2026,4,28), dur: 1.0, reason: 'New home office setup',               status: 'APPROVED' },
    { type: 'CASUAL', start: d(2026,6,8),  end: d(2026,6,8),  dur: 1.0, reason: 'Vehicle registration at RTO',         status: 'APPROVED' },
    { type: 'CASUAL', start: d(2026,6,18), end: d(2026,6,18), dur: 1.0, reason: 'Shifting to new apartment',           status: 'REJECTED', comment: 'Month-end audit period — please shift the date' },
    { type: 'CASUAL', start: d(2026,7,2),  end: d(2026,7,2),  dur: 1.0, reason: 'House shifting completion tasks',     status: 'PENDING' },
  ],
  'pooja.nair@company.com': [
    { type: 'CASUAL', start: d(2026,4,14), end: d(2026,4,14), dur: 1.0, reason: 'Family function attendance',           status: 'APPROVED' },
    { type: 'SICK',   start: d(2026,5,19), end: d(2026,5,20), dur: 2.0, reason: 'Food poisoning, admitted for IV',      status: 'APPROVED' },
    { type: 'WFH',   start: d(2026,6,13), end: d(2026,6,13), dur: 1.0, reason: 'Client documentation from home',       status: 'APPROVED' },
    { type: 'WFH',   start: d(2026,6,26), end: d(2026,6,26), dur: 1.0, reason: 'Onsite vendor call scheduled',         status: 'PENDING' },
  ],
  'amit.sharma@company.com': [
    { type: 'WFH',    start: d(2026,4,20), end: d(2026,4,21), dur: 2.0, reason: 'Remote site documentation review',    status: 'APPROVED' },
    { type: 'CASUAL', start: d(2026,5,26), end: d(2026,5,26), dur: 1.0, reason: 'Long weekend travel plan',            status: 'REJECTED', comment: 'Operations team at minimum headcount on this date' },
    { type: 'SICK',   start: d(2026,6,11), end: d(2026,6,11), dur: 1.0, reason: 'Severe headache and nausea',           status: 'APPROVED' },
    { type: 'CASUAL', start: d(2026,6,29), end: d(2026,6,29), dur: 1.0, reason: 'Personal errand',                     status: 'PENDING' },
  ],
  'divya.krishnan@company.com': [
    { type: 'WFH',    start: d(2026,5,18), end: d(2026,5,19), dur: 2.0, reason: 'Vendor coordination calls from home',  status: 'APPROVED' },
    { type: 'CASUAL', start: d(2026,6,3),  end: d(2026,6,3),  dur: 1.0, reason: 'Property registration appointment',   status: 'APPROVED' },
    { type: 'HALF_DAY', start: d(2026,6,25), end: d(2026,6,25), dur: 0.5, reason: 'Medical follow-up in afternoon',     status: 'PENDING' },
  ],
  'ravi.nair@company.com': [
    { type: 'WFH',    start: d(2026,3,2),  end: d(2026,3,3),  dur: 2.0, reason: 'Sprint planning from home office',    status: 'APPROVED' },
    { type: 'CASUAL', start: d(2026,4,24), end: d(2026,4,24), dur: 1.0, reason: 'Government office visit for PAN',     status: 'APPROVED' },
    { type: 'SICK',   start: d(2026,5,28), end: d(2026,5,28), dur: 1.0, reason: 'High fever, on medication',           status: 'APPROVED' },
    { type: 'CASUAL', start: d(2026,6,26), end: d(2026,6,27), dur: 2.0, reason: 'Travel to native place',              status: 'PENDING' },
  ],
  'meena.das@company.com': [
    { type: 'SICK',   start: d(2026,5,5),  end: d(2026,5,6),  dur: 2.0, reason: 'Flu symptoms and cough',              status: 'APPROVED' },
    { type: 'WFH',   start: d(2026,6,1),  end: d(2026,6,2),  dur: 2.0, reason: 'Documentation sprint from home',      status: 'APPROVED' },
    { type: 'WFH',   start: d(2026,6,25), end: d(2026,6,26), dur: 2.0, reason: 'Finishing release documentation',     status: 'PENDING' },
  ],
};

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting realistic data seed...\n');

  const empPwd  = await bcrypt.hash('Employee@1234', 12);
  const mgrPwd  = await bcrypt.hash('Manager@1234', 12);

  // ── 1. New departments ────────────────────────────────────────────────────
  const deptDefs = [
    { name: 'Sales & Marketing',  description: 'Sales pipeline and marketing campaigns' },
    { name: 'Finance & Accounts', description: 'Financial planning, budgets and audits' },
    { name: 'Operations',         description: 'Business operations and logistics' },
  ];
  const depts = {};
  for (const def of deptDefs) {
    let dep = await prisma.department.findFirst({ where: { name: def.name } });
    if (!dep) dep = await prisma.department.create({ data: def });
    depts[def.name] = dep;
    console.log(`Dept: ${dep.name} (id=${dep.id})`);
  }

  // Get existing depts
  const engDept = await prisma.department.findFirst({ where: { name: 'Engineering' } });
  const hrDept  = await prisma.department.findFirst({ where: { name: 'Human Resources' } });

  // ── 2. New managers ───────────────────────────────────────────────────────
  const mgrDefs = [
    { name: 'Rahul Verma',  email: 'rahul.verma@company.com',  empId: 'EMP011', deptId: depts['Sales & Marketing'].id,  joinedAt: d(2026,1,15), phone: '+91-98700-11001' },
    { name: 'Priya Sharma', email: 'priya.sharma@company.com', empId: 'EMP012', deptId: depts['Finance & Accounts'].id, joinedAt: d(2026,2,1),  phone: '+91-98700-11002' },
    { name: 'Deepak Joshi', email: 'deepak.joshi@company.com', empId: 'EMP013', deptId: depts['Operations'].id,          joinedAt: d(2026,1,8),  phone: '+91-98700-11003' },
  ];
  const mgrById = {};
  for (const m of mgrDefs) {
    let u = await prisma.user.findUnique({ where: { email: m.email } });
    if (!u) {
      u = await prisma.user.create({ data: {
        name: m.name, email: m.email, password: mgrPwd,
        role: 'MANAGER', employeeId: m.empId, departmentId: m.deptId,
        phone: m.phone, isActive: true, createdAt: m.joinedAt,
      }});
      const balExists = await prisma.leaveBalance.findFirst({ where: { employeeId: u.id, year: 2026 } });
      if (!balExists) await prisma.leaveBalance.create({ data: { employeeId: u.id, year: 2026, casualTotal: 12, sickTotal: 10, halfDayTotal: 6, wfhTotal: 24 } });
      console.log(`Manager: ${u.name} (id=${u.id})`);
    } else {
      console.log(`Manager already exists: ${u.name} (id=${u.id})`);
    }
    mgrById[m.email] = { ...u, joinedAt: m.joinedAt };
  }

  // ── 3. New employees ───────────────────────────────────────────────────────
  const empDefs = [
    // Sales
    { name: 'Kavya Reddy',    email: 'kavya.reddy@company.com',    empId: 'EMP021', dept: 'Sales & Marketing',  mgrEmail: 'rahul.verma@company.com',    joinedAt: d(2026,2,10), phone: '+91-97600-21001' },
    { name: 'Arjun Kumar',    email: 'arjun.kumar@company.com',    empId: 'EMP022', dept: 'Sales & Marketing',  mgrEmail: 'rahul.verma@company.com',    joinedAt: d(2026,3,1),  phone: '+91-97600-21002' },
    { name: 'Sneha Patel',    email: 'sneha.patel@company.com',    empId: 'EMP023', dept: 'Sales & Marketing',  mgrEmail: 'rahul.verma@company.com',    joinedAt: d(2026,3,15), phone: '+91-97600-21003' },
    // Finance
    { name: 'Rohan Mehta',    email: 'rohan.mehta@company.com',    empId: 'EMP024', dept: 'Finance & Accounts', mgrEmail: 'priya.sharma@company.com',   joinedAt: d(2026,2,20), phone: '+91-97600-21004' },
    { name: 'Neha Gupta',     email: 'neha.gupta@company.com',     empId: 'EMP025', dept: 'Finance & Accounts', mgrEmail: 'priya.sharma@company.com',   joinedAt: d(2026,4,1),  phone: '+91-97600-21005' },
    { name: 'Vikas Singh',    email: 'vikas.singh@company.com',    empId: 'EMP026', dept: 'Finance & Accounts', mgrEmail: 'priya.sharma@company.com',   joinedAt: d(2026,4,15), phone: '+91-97600-21006' },
    // Operations
    { name: 'Pooja Nair',     email: 'pooja.nair@company.com',     empId: 'EMP027', dept: 'Operations',         mgrEmail: 'deepak.joshi@company.com',   joinedAt: d(2026,3,10), phone: '+91-97600-21007' },
    { name: 'Amit Sharma',    email: 'amit.sharma@company.com',    empId: 'EMP028', dept: 'Operations',         mgrEmail: 'deepak.joshi@company.com',   joinedAt: d(2026,3,20), phone: '+91-97600-21008' },
    { name: 'Divya Krishnan', email: 'divya.krishnan@company.com', empId: 'EMP029', dept: 'Operations',         mgrEmail: 'deepak.joshi@company.com',   joinedAt: d(2026,5,1),  phone: '+91-97600-21009' },
    // Engineering extras
    { name: 'Ravi Nair',  email: 'ravi.nair@company.com',  empId: 'EMP030', dept: 'Engineering', mgrEmail: 'manager@company.com', joinedAt: d(2026,2,5),  phone: '+91-97600-21010' },
    { name: 'Meena Das',  email: 'meena.das@company.com',  empId: 'EMP031', dept: 'Engineering', mgrEmail: 'manager@company.com', joinedAt: d(2026,4,10), phone: '+91-97600-21011' },
  ];

  const empById = {};
  for (const e of empDefs) {
    const mgrUser = e.mgrEmail === 'manager@company.com'
      ? await prisma.user.findUnique({ where: { email: 'manager@company.com' } })
      : mgrById[e.mgrEmail];

    const deptRec = e.dept === 'Engineering' ? engDept : depts[e.dept];
    if (!deptRec || !mgrUser) { console.warn(`  ⚠ Skipping ${e.name}: missing dept or manager`); continue; }

    let u = await prisma.user.findUnique({ where: { email: e.email } });
    if (!u) {
      u = await prisma.user.create({ data: {
        name: e.name, email: e.email, password: empPwd,
        role: 'EMPLOYEE', employeeId: e.empId,
        departmentId: deptRec.id, managerId: mgrUser.id,
        phone: e.phone, isActive: true, createdAt: e.joinedAt,
      }});
      const balExists = await prisma.leaveBalance.findFirst({ where: { employeeId: u.id, year: 2026 } });
      if (!balExists) await prisma.leaveBalance.create({ data: { employeeId: u.id, year: 2026, casualTotal: 12, sickTotal: 10, halfDayTotal: 6, wfhTotal: 24 } });
      console.log(`Employee: ${u.name} (id=${u.id})`);
    } else {
      console.log(`Employee already exists: ${u.name} (id=${u.id})`);
    }
    empById[e.email] = { ...u, joinedAt: e.joinedAt };
  }

  // ── 4. Set department heads ───────────────────────────────────────────────
  const engMgr = await prisma.user.findUnique({ where: { email: 'manager@company.com' } });
  if (engDept && engMgr) await prisma.department.update({ where: { id: engDept.id }, data: { headId: engMgr.id } });
  for (const [dn, mgr] of [
    ['Sales & Marketing',  mgrById['rahul.verma@company.com']],
    ['Finance & Accounts', mgrById['priya.sharma@company.com']],
    ['Operations',         mgrById['deepak.joshi@company.com']],
  ]) {
    if (mgr) await prisma.department.update({ where: { id: depts[dn].id }, data: { headId: mgr.id } });
  }
  console.log('\nDepartment heads set.');

  // ── 5. Fix Sonu Manager (id=6): add employeeId if missing ────────────────
  const sonuMgr = await prisma.user.findUnique({ where: { email: 'sonu.chaudhary@policyx.com' } });
  if (sonuMgr && !sonuMgr.employeeId) {
    await prisma.user.update({ where: { id: sonuMgr.id }, data: { employeeId: 'EMP006', departmentId: hrDept?.id } });
    console.log('Fixed Sonu Manager employeeId → EMP006');
  }
  // Fix Sonu Employee (id=8) managerId
  const sonuEmp = await prisma.user.findUnique({ where: { email: 'chaudhary123@gmail.com' } });
  if (sonuEmp && !sonuEmp.employeeId) {
    await prisma.user.update({ where: { id: sonuEmp.id }, data: { employeeId: 'EMP008' } });
  }

  // ── 6. Generate leave + attendance for every new user ────────────────────
  console.log('\nGenerating leave and attendance data...\n');

  const allUsers = [
    ...mgrDefs.map(m => ({ email: m.email, user: mgrById[m.email], joinedAt: m.joinedAt })),
    ...empDefs.map(e => ({ email: e.email, user: empById[e.email], joinedAt: e.joinedAt })).filter(x => x.user),
  ];

  const reviewer = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

  for (const { email, user, joinedAt } of allUsers) {
    if (!user?.id) continue;
    const userLeaves = USER_LEAVES[email] ?? [];
    await seedUserData(user, joinedAt, userLeaves, reviewer);
    process.stdout.write(`  ✓ ${user.name}\n`);
  }

  console.log('\n✅ Realistic data seed complete!');
  console.log('\nSummary:');
  const counts = await Promise.all([
    prisma.user.count(),
    prisma.department.count(),
    prisma.leave.count(),
    prisma.attendance.count(),
    prisma.leaveBalance.count(),
  ]);
  console.log(`  Users: ${counts[0]}, Departments: ${counts[1]}, Leaves: ${counts[2]}, Attendance: ${counts[3]}, Balances: ${counts[4]}`);
}

// ── Per-user data generator ───────────────────────────────────────────────────

async function seedUserData(user, joinedAt, leaveDefs, reviewer) {
  const leaveDateKeys = new Set(); // 'YYYY-MM-DD' strings of approved leave days

  // 6a. Create leaves
  for (const lv of leaveDefs) {
    const existing = await prisma.leave.findFirst({
      where: { employeeId: user.id, startDate: lv.start, endDate: lv.end },
    });
    if (existing) {
      // Still mark dates so we skip them in attendance
      if (lv.status === 'APPROVED') markDates(leaveDateKeys, lv.start, lv.end);
      continue;
    }

    const workingDays = countWorkingDays(lv.start, lv.end);
    const dur = lv.type === 'HALF_DAY' ? 0.5 : workingDays;

    const leaveData = {
      employeeId: user.id, type: lv.type,
      startDate: lv.start, endDate: lv.end,
      duration: dur, reason: lv.reason,
      status: lv.status,
    };
    if (lv.status === 'APPROVED') {
      leaveData.reviewedById = reviewer?.id;
      leaveData.reviewedAt   = addDays(lv.start, -1);
      leaveData.comments     = 'Approved';
    } else if (lv.status === 'REJECTED') {
      leaveData.reviewedById = reviewer?.id;
      leaveData.reviewedAt   = addDays(lv.start, -1);
      leaveData.comments     = lv.comment ?? 'Not approved at this time';
    }

    await prisma.leave.create({ data: leaveData });

    if (lv.status === 'APPROVED') {
      markDates(leaveDateKeys, lv.start, lv.end);

      // Deduct balance
      const field = BALANCE_FIELD[lv.type];
      if (field) {
        const inc = lv.type === 'HALF_DAY' ? 1 : workingDays;
        await prisma.leaveBalance.updateMany({
          where: { employeeId: user.id, year: 2026 },
          data: { [field]: { increment: inc } },
        });
      }

      // Create attendance for leave days (past only)
      const attStatus = LEAVE_TO_ATT_STATUS[lv.type];
      for (const day of getWeekdays(lv.start, lv.end)) {
        if (day > TODAY) continue;
        const exists = await prisma.attendance.findUnique({
          where: { employeeId_date: { employeeId: user.id, date: day } },
        });
        if (!exists) {
          const rec = { employeeId: user.id, date: day, status: attStatus, note: `${lv.type} leave` };
          if (lv.type === 'WFH') {
            rec.checkInTime  = makeCheckIn(day, 9, 0);
            rec.checkOutTime = makeCheckOut(day, 17, 30);
            rec.workingHours = 8.5;
          } else if (lv.type === 'HALF_DAY') {
            rec.checkInTime  = makeCheckIn(day, 9, 0);
            rec.checkOutTime = makeCheckOut(day, 13, 0);
            rec.workingHours = 4.0;
          }
          await prisma.attendance.create({ data: rec });
        }
      }
    }
  }

  // 6b. Regular attendance for non-leave weekdays
  const weekdays = getWeekdays(joinedAt, TODAY);
  let seed = user.id;
  for (let i = 0; i < weekdays.length; i++) {
    const day = weekdays[i];
    const key = dateKey(day);
    if (leaveDateKeys.has(key)) { seed++; continue; }

    const exists = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: user.id, date: day } },
    });
    if (exists) { seed++; continue; }

    const pattern = getAttPattern(user.id, seed);
    seed++;

    const rec = makeAttRecord(day, pattern, user.id);
    await prisma.attendance.create({ data: { employeeId: user.id, ...rec } });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function dateKey(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}

function markDates(set, start, end) {
  for (const day of getWeekdays(start, end)) set.add(dateKey(day));
}

function getAttPattern(userId, seed) {
  const v = ((userId * 31) + seed) % 20;
  if (v === 0)           return 'ABSENT';
  if (v >= 1 && v <= 3)  return 'WFH';
  if (v >= 4 && v <= 5)  return 'HALF_DAY';
  return 'PRESENT';
}

function makeAttRecord(date, status, userId) {
  const min = (userId % 4) * 15;
  if (status === 'ABSENT') {
    return { date, status, checkInTime: null, checkOutTime: null, workingHours: null };
  }
  if (status === 'HALF_DAY') {
    const ci = makeCheckIn(date, 9, min);
    const co = makeCheckOut(date, 13, min);
    return { date, status, checkInTime: ci, checkOutTime: co, workingHours: 4.0 };
  }
  if (status === 'WFH') {
    const ci = makeCheckIn(date, 9, min);
    const co = makeCheckOut(date, 17, 30);
    return { date, status, checkInTime: ci, checkOutTime: co, workingHours: 8.5 };
  }
  // PRESENT
  const ci = makeCheckIn(date, 9, min);
  const co = makeCheckOut(date, 18, min);
  const wh = parseFloat(((co.getTime() - ci.getTime()) / 3_600_000).toFixed(2));
  return { date, status, checkInTime: ci, checkOutTime: co, workingHours: wh };
}

// ── Run ───────────────────────────────────────────────────────────────────────

main()
  .catch((err) => { console.error('Seed error:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
