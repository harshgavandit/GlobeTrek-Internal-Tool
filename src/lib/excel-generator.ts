import { Quotation,CompanySettings } from '@/types';
import { downloadQuotation } from './download-quotation';
export const generateQuotationExcel=(q:Quotation,_settings?:CompanySettings)=>downloadQuotation(q,'xlsx');
