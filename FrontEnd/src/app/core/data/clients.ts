import { L } from '../models/content.model';

/**
 * Client logos for the homepage marquee (section 08). Files live in
 * public/images/clients and were trimmed and converted to WebP from the
 * MSP client-logo folder on Google Drive. Shown when the CMS has no active
 * partners; once partners are published in Admin → Partners those win.
 * Ordered with the institutional and major clients first.
 */
export interface ClientLogo {
  slug: string;
  name: L;
  /**
   * Display size in px. Optically balanced: each logo gets about the same
   * visual area (wide marks shorter, compact marks taller), nudged smaller
   * for heavily inked marks, within a 132×60 box.
   */
  width: number;
  height: number;
}

export const CLIENT_LOGOS: ClientLogo[] = [
  { slug: 'royal-court', name: { en: 'The Royal Court', ar: 'الديوان الملكي' }, width: 117, height: 50 },
  { slug: 'qiddiya', name: { en: 'Qiddiya', ar: 'القدية' }, width: 63, height: 60 },
  { slug: 'roshn', name: { en: 'ROSHN', ar: 'روشن' }, width: 84, height: 60 },
  { slug: 'kacst', name: { en: 'King Abdulaziz City for Science and Technology', ar: 'مدينة الملك عبدالعزيز للعلوم والتقنية' }, width: 86, height: 60 },
  { slug: 'king-saud-university', name: { en: 'King Saud University', ar: 'جامعة الملك سعود' }, width: 52, height: 60 },
  { slug: 'king-fahd-national-library', name: { en: 'King Fahd National Library', ar: 'مكتبة الملك فهد الوطنية' }, width: 84, height: 60 },
  { slug: 'ministry-of-housing', name: { en: 'Ministry of Housing', ar: 'وزارة الإسكان' }, width: 60, height: 60 },
  { slug: 'tvtc', name: { en: 'Technical and Vocational Training Corporation', ar: 'المؤسسة العامة للتدريب التقني والمهني' }, width: 55, height: 60 },
  { slug: 'youth-welfare', name: { en: 'General Presidency of Youth Welfare', ar: 'الرئاسة العامة لرعاية الشباب' }, width: 37, height: 60 },
  { slug: 'taqnia', name: { en: 'TAQNIA', ar: 'تقنية' }, width: 124, height: 52 },
  { slug: 'sofitel', name: { en: 'Sofitel', ar: 'سوفيتيل' }, width: 68, height: 60 },
  { slug: 'planet-hollywood', name: { en: 'Planet Hollywood', ar: 'بلانيت هوليوود' }, width: 72, height: 58 },
  { slug: 'medgulf', name: { en: 'MedGulf', ar: 'ميدغلف' }, width: 132, height: 33 },
  { slug: 'gulf-payments', name: { en: 'Gulf Payments', ar: 'المدفوعات الخليجية' }, width: 132, height: 37 },
  { slug: 'c4c', name: { en: 'Center for Cybersecurity', ar: 'مركز الأمن السيبراني' }, width: 121, height: 55 },
  { slug: 'spdc', name: { en: 'Saudi Professional Developers Company', ar: 'الشركة السعودية للمطورين المحترفين' }, width: 98, height: 43 },
  { slug: 'saleh-al-nahdi-sons', name: { en: 'Saleh Al Nahdi Sons Holding Company', ar: 'شركة أبناء صالح النهدي القابضة' }, width: 85, height: 60 },
  { slug: 'al-waseel', name: { en: 'Al Waseel Resort & Spa', ar: 'منتجع الوصيل' }, width: 96, height: 60 },
  { slug: 'sadjg', name: { en: 'Sadjg Coffee Shop', ar: 'صادق كوفي شوب' }, width: 101, height: 53 },
  { slug: 'alsuddah', name: { en: 'Al Suddah Restaurant', ar: 'مطعم السدة' }, width: 52, height: 60 },
  { slug: 'valley', name: { en: 'Valley Software Solutions', ar: 'فالي للحلول البرمجية' }, width: 132, height: 30 },
  { slug: 'capio-diem', name: { en: 'Capio Diem', ar: 'كابيو دييم' }, width: 102, height: 56 },
  { slug: 'tealea', name: { en: 'Tealea', ar: 'تيليا' }, width: 132, height: 24 },
  { slug: 'mc', name: { en: 'MC', ar: 'MC' }, width: 45, height: 60 },
  { slug: 'smaa-burj-al-arab', name: { en: 'Smaa Burj Al Arab Co.', ar: 'شركة سماء برج العرب' }, width: 82, height: 60 },
  { slug: 'yes-noodles', name: { en: 'Yes Noodles', ar: 'يس نودلز' }, width: 72, height: 60 },
  { slug: 'dyari', name: { en: 'Dyari Real Estate', ar: 'دياري العقارية' }, width: 96, height: 54 },
  { slug: 'pylons', name: { en: 'Pylons', ar: 'بايلونز' }, width: 61, height: 60 },
  { slug: 'sbc-al-sabaan', name: { en: 'SBC Al-Sabaan', ar: 'SBC السبعان' }, width: 84, height: 52 },
  { slug: 'haretna', name: { en: 'Haretna', ar: 'حارتنا' }, width: 100, height: 42 },
  { slug: 'lativa', name: { en: 'Lativa', ar: 'لاتيفا' }, width: 113, height: 58 },
  { slug: 'j-caffe', name: { en: 'J Caffe', ar: 'جي كافيه' }, width: 95, height: 55 },
  { slug: 'coffee', name: { en: 'Coffee', ar: 'كوفي' }, width: 132, height: 26 },
  { slug: 'bic', name: { en: 'BIC', ar: 'BIC' }, width: 64, height: 60 },
  { slug: 'coffee-sharp', name: { en: 'Coffee-Sharp', ar: 'كوفي شارب' }, width: 111, height: 51 },
  { slug: 'al-yamamah', name: { en: 'Al Yamamah', ar: 'اليمامة' }, width: 86, height: 55 },
  { slug: 'makeen', name: { en: 'Makeen', ar: 'مكين' }, width: 108, height: 54 },
  { slug: 'al-dhuhayan-awqaf', name: { en: 'Al Dhuhayan Awqaf', ar: 'أوقاف الضحيان' }, width: 74, height: 60 },
  { slug: 'arb', name: { en: 'ARB', ar: 'ARB' }, width: 32, height: 60 },
  { slug: 'mans-station', name: { en: 'Man\'s Station', ar: 'موقع الرجل' }, width: 128, height: 32 },
  { slug: 'castle-laundry', name: { en: 'United Castle Laundry', ar: 'مغاسل القلعة' }, width: 58, height: 60 },
  { slug: 'salt-gym', name: { en: 'Salt Gym', ar: 'سولت جيم' }, width: 31, height: 60 },
  { slug: 'bagel-o-bagel', name: { en: 'Bagel-O-Bagel', ar: 'بيغل أو بيغل' }, width: 95, height: 43 },
  { slug: 'aldahim', name: { en: 'Al Dahim', ar: 'الدحيم' }, width: 114, height: 43 },
  { slug: 'handasiya', name: { en: 'Handasiya', ar: 'هندسية' }, width: 92, height: 60 },
  { slug: 'miral-dental', name: { en: 'Miral Dental Clinic', ar: 'ميرال لطب الأسنان' }, width: 55, height: 60 },
  { slug: 'java', name: { en: 'Java', ar: 'جافا' }, width: 32, height: 60 },
  { slug: 'bella-italia', name: { en: 'Bella Italia', ar: 'بيلا إيطاليا' }, width: 119, height: 44 },
  { slug: 'omni-restaurants', name: { en: 'Omni Omni Restaurants', ar: 'مطاعم أومني' }, width: 111, height: 60 },
  { slug: 'hana', name: { en: 'Hana Investment', ar: 'هنا للاستثمار' }, width: 105, height: 51 },
  { slug: 'norat', name: { en: 'Norat', ar: 'نورات' }, width: 118, height: 53 },
];
