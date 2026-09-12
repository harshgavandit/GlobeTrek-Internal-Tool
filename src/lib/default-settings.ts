import { CompanySettings } from '@/types';
import { STANDARD_TERMS_VERSION } from './quotation-terms';
export const EMPTY_SETTINGS: CompanySettings = {
 id:'company', company_name:'GlobeTrek Engineering Corporation', company_tagline:'Engineering Corporation',
 logo_path:'/brand/globetrek-new-logo.png',
 terms_template_version:STANDARD_TERMS_VERSION,
 address:'Office No. 2, Ground floor, Punit Tower 2, Plot No. 53, Sector 11, CBD Belapur, Navi Mumbai - 400614, India.',
 email:'globetrekengineering@gmail.com', phone:'+91-9323627990 (WhatsApp)', website:'https://globetrekengg.com', gstin:'27AAMFG8874A1Z4',
 bank_name:'IDFC FIRST Bank', bank_account_name:'Globetrek Engineering Corporation', bank_account_no:'10148119695', bank_ifsc:'IDFB0040172', bank_swift:'IDFBINBBMUM', bank_branch:'Navi Mumbai CBD Belapur Branch',
 bank_accounts:[{bank_name:'IDFC FIRST Bank',account_name:'Globetrek Engineering Corporation',account_no:'10148119695',ifsc:'IDFB0040172',swift:'IDFBINBBMUM',branch:'Navi Mumbai CBD Belapur Branch'},{bank_name:'Indian Bank',account_name:'Globetrek Engineering Corporation',account_no:'6209411911',ifsc:'IDIB000N110',branch:'Nerul, Nerul East, Navi Mumbai'}],
 payment_terms_default:'100% payment is required against the proforma invoice prior to dispatch.\nPayments can be made via bank transfer or cash, as per the bank details provided below.', delivery_terms_default:'Delivery shall be made from available stock or within 1 to 2 weeks from the date of receipt of a technically and commercially clear firm order in writing.\nFor specific delivery schedules, kindly contact us directly.', warranty_terms_default:'The instrument is covered under a one-year warranty from the date of delivery, against manufacturing defects when operated under normal working conditions.\nThe warranty does not cover damages resulting from: Power fluctuations, Improper earthing, Incorrect operation, Overloading, Misuse, negligence, or external damages, Etc.',
 validity_days_default:30, freight_terms_default:'Freight, insurance, and all transit-related charges shall be borne by the buyer.\nUnless otherwise specified, shipments will be dispatched via the nearest and most reliable transporter or courier on a Freight-to-Pay basis.\nIf the buyer wishes to utilize a specific transporter or courier, the same must be clearly mentioned in the Purchase Order with relevant details.', quotation_prefix:'GTEC/QTN', default_notes:'All clerical, typographical, or calculation errors are subject to correction without prior notice.'
};
