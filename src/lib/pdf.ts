import type { jsPDF as JsPDF } from 'jspdf';
import {
  BANK_ACCOUNTS,
  PLEDGE_VERSE,
  STATION_ADDRESS,
  STATION_CONTACT,
  STATION_FREQUENCY,
  STATION_NAME,
} from './constants';
import { formatDate, formatDateTime, formatDay, formatMoney, toDayInput } from './format';
import type { PrepStats } from './stats';
import type { Gift, ShowPrep, UserProfile } from './types';

const BRAND: [number, number, number] = [18, 97, 62];
const INK: [number, number, number] = [28, 25, 23];
const MUTED: [number, number, number] = [120, 113, 108];
const MARGIN = 18;

async function newDoc() {
  const { jsPDF } = await import('jspdf');
  return new jsPDF({ unit: 'mm', format: 'a4' });
}

/** Small writer that tracks the cursor and adds pages as needed. */
function writer(doc: JsPDF) {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  let y = MARGIN;

  const ensure = (space: number) => {
    if (y + space > height - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  return {
    width,
    get y() {
      return y;
    },
    gap(h: number) {
      y += h;
    },
    header(title: string, subtitle: string) {
      doc.setFillColor(...BRAND);
      doc.rect(0, 0, width, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text(`${STATION_NAME} ${STATION_FREQUENCY}`, MARGIN, 13);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`${title} | ${subtitle}`, MARGIN, 21);
      y = 40;
    },
    heading(text: string) {
      ensure(12);
      doc.setTextColor(...BRAND);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(text.toUpperCase(), MARGIN, y);
      y += 2;
      doc.setDrawColor(...BRAND);
      doc.setLineWidth(0.3);
      doc.line(MARGIN, y, width - MARGIN, y);
      y += 6;
    },
    meta(label: string, value: string) {
      ensure(6);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...MUTED);
      doc.text(label, MARGIN, y);
      doc.setTextColor(...INK);
      doc.text(value, MARGIN + 42, y);
      y += 6;
    },
    paragraph(text: string) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...INK);
      const lines: string[] = doc.splitTextToSize(text, width - MARGIN * 2);
      for (const line of lines) {
        ensure(5);
        doc.text(line, MARGIN, y);
        y += 5;
      }
      y += 3;
    },
    footer() {
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(...MUTED);
        doc.text(`Generated ${formatDateTime(new Date())}`, MARGIN, height - 8);
        doc.text(`Page ${i} of ${pages}`, width - MARGIN, height - 8, { align: 'right' });
      }
    },
  };
}

const safeName = (s: string) => s.replace(/[^\w-]+/g, '_').replace(/_+/g, '_');

export async function downloadShowPrepPdf(prep: ShowPrep) {
  const doc = await newDoc();
  const w = writer(doc);
  w.header('Weekly Show Preparation', prep.showName);

  w.meta('Show', prep.showName);
  w.meta('Week starting', formatDay(prep.weekStarting));
  w.meta('Presenter', `${prep.submittedByName} (${prep.submittedByRole})`);
  w.meta('Submitted', formatDateTime(prep.createdAt));
  if (prep.reviewedAt) w.meta('Reviewed', `${prep.reviewedByName} | ${formatDateTime(prep.reviewedAt)}`);
  w.gap(4);

  w.heading('Topics & themes');
  w.paragraph(prep.topics);

  const slots = prep.timeSlots.filter((s) => s.airTimeHour.trim() || s.talkingPoints.trim());
  if (slots.length) {
    w.heading('Hour-by-hour plan');
    for (const slot of slots) {
      w.paragraph(`${slot.airTimeHour || 'Time not set'} - ${slot.talkingPoints || 'No talking points'}`);
    }
  }
  w.heading('Interview');
  const interviews = prep.hasInterview ? (prep.interviews ?? []) : [];
  if (!interviews.length) w.paragraph('No interview planned this week.');
  interviews.forEach((iv, i) => {
    if (interviews.length > 1) w.paragraph(`Interviewee ${i + 1}`);
    w.meta('Name', iv.name);
    w.meta('Position', iv.position);
    if (iv.organisation) w.meta('Organisation', iv.organisation);
    w.meta('Contact', iv.phone);
    w.meta('When', `${formatDay(iv.date)} at ${iv.time}`);
    w.meta('Format', iv.format);
    w.paragraph(`Topic: ${iv.topic}`);
    if (iv.notes) w.paragraph(`Notes: ${iv.notes}`);
  });
  if (prep.guests) {
    w.heading('Guests (earlier notes)');
    w.paragraph(prep.guests);
  }
  if (prep.musicPlaylist) {
    w.heading('Music playlist');
    w.paragraph(prep.musicPlaylist);
  }
  if (prep.technicalRequest) {
    w.heading('Requests for the technical team');
    w.paragraph(prep.technicalRequest);
  }
  if (prep.reviewNote) {
    w.heading('Reviewer note');
    w.paragraph(prep.reviewNote);
  }
  w.footer();
  doc.save(`ShowPrep_${safeName(prep.submittedByName)}_${prep.weekStarting}.pdf`);
}

export async function downloadTrackerPdf(rows: { user: UserProfile; stats: PrepStats }[]) {
  const doc = await newDoc();
  const w = writer(doc);
  w.header('Show Prep Report', formatDate(new Date()));

  const submitted = rows.filter((r) => r.stats.submittedThisWeek).length;
  w.heading('Summary');
  w.meta('Presenters', String(rows.length));
  w.meta('Submitted this week', `${submitted} of ${rows.length}`);
  w.meta('This month', String(rows.reduce((n, r) => n + r.stats.thisMonth, 0)));
  w.meta('All time', String(rows.reduce((n, r) => n + r.stats.total, 0)));
  w.gap(4);

  w.heading('By presenter');
  rows.forEach(({ user, stats }, i) => {
    w.paragraph(
      `${i + 1}. ${user.name} (${user.role}) - this week: ${stats.thisWeek}, this month: ${stats.thisMonth}, ` +
        `total: ${stats.total}, streak: ${stats.streak} wk, last: ${stats.lastSubmission ? formatDate(stats.lastSubmission) : 'never'}`,
    );
  });
  w.footer();
  doc.save(`ShowPrepReport_${toDayInput(new Date())}.pdf`);
}

/** Printable pledge / gift receipt, styled after the paper Shareathon form. */
export async function downloadGiftReceipt(gift: Gift) {
  const doc = await newDoc();
  const w = writer(doc);
  const title =
    gift.type === 'pledge'
      ? 'Shareathon Pledge'
      : gift.type === 'cash'
        ? 'Shareathon Gift Receipt'
        : 'In-kind Gift Receipt';
  w.header(title, gift.refNo);

  w.paragraph(STATION_ADDRESS);
  w.paragraph(STATION_CONTACT);
  w.gap(2);

  w.heading('Giver');
  w.meta('Name', gift.donorName);
  w.meta('Category', gift.category);
  w.meta(
    'Location',
    gift.location === 'PNG'
      ? [gift.city, gift.province].filter(Boolean).join(', ')
      : [gift.overseasLocation, gift.country].filter(Boolean).join(', '),
  );
  if (gift.mobile) w.meta('Mobile', gift.mobile);
  if (gift.email) w.meta('Email', gift.email);
  if (gift.church) w.meta('Church', [gift.church, gift.congregation].filter(Boolean).join(' - '));
  w.gap(4);

  const paid = gift.payments.reduce((n, p) => n + p.amount, 0);
  w.heading(gift.type === 'kind' ? 'Gift' : 'Amounts');
  w.meta('Reference', gift.refNo);
  w.meta('Date', formatDay(gift.giftDate));
  if (gift.type === 'pledge') {
    w.meta('Pledged', formatMoney(gift.pledgeAmount, gift.currency));
    w.meta('Schedule', [gift.schedule, gift.scheduleDetails].filter(Boolean).join(' - '));
    w.meta('Paid so far', formatMoney(paid, gift.currency));
    w.meta('Balance', formatMoney(Math.max((gift.pledgeAmount ?? 0) - paid, 0), gift.currency));
  } else if (gift.type === 'cash') {
    w.meta('Amount received', formatMoney(paid, gift.currency));
  } else {
    w.meta('Items', gift.itemDescription ?? '');
    if (gift.quantity) w.meta('Quantity', gift.quantity);
    if (gift.estimatedValue) w.meta('Estimated value', formatMoney(gift.estimatedValue, gift.currency));
  }

  if (gift.payments.length) {
    w.gap(2);
    w.heading('Payments received');
    gift.payments.forEach((p) =>
      w.paragraph(
        `${formatDate(p.at)}  -  ${formatMoney(p.amount, gift.currency)}  (${p.method})  received by ${p.byName}${p.note ? `  -  ${p.note}` : ''}`,
      ),
    );
  }

  if (gift.type === 'pledge') {
    w.gap(2);
    w.heading('How to pay');
    BANK_ACCOUNTS.forEach((b) => w.paragraph(b));
    w.paragraph(`Please quote your reference ${gift.refNo} when you pay.`);
  }

  w.gap(4);
  w.paragraph(`Recorded by ${gift.createdByName}. Thank you and God bless you.`);
  w.paragraph(PLEDGE_VERSE.replace(/[“”]/g, '"'));
  w.footer();
  doc.save(`${gift.refNo.replace(/\s+/g, '')}_${safeName(gift.donorName)}.pdf`);
}
