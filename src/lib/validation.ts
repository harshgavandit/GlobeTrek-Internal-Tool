import { z } from 'zod';
import Decimal from 'decimal.js';
import { QUOTATION_CHARGE_FIELDS } from './quotation-commercial';
export const idSchema=z.string().uuid();
const text=z.string().trim().max(5000);
const name=z.string().trim().min(1).max(200);
export const money=z.number().finite().min(0).max(999999999).refine(v=>new Decimal(v).decimalPlaces()<=2,'Use at most two decimal places');
const percent=money.refine(v=>v<=100,'Percentage must be between 0 and 100');
const exchangeRate=z.number().finite().positive().max(1000000).refine(v=>new Decimal(v).decimalPlaces()<=6,'Conversion rate supports six decimal places');
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10)===v,'Invalid date');
export const categorySchema=z.object({name,description:text.optional()});
export const priceListSchema=z.object({name,currency:z.enum(['INR','USD','EUR','GBP','AED']),description:text.optional(),is_active:z.boolean().optional()});
export const customerSchema=z.object({name,contact_person:text.optional(),email:z.union([z.string().email().max(254),z.literal('')]).optional(),phone:text.optional(),address:text.optional(),city:text.optional(),country:text.optional(),tax_number:text.optional()});
export const productSchema=z.object({sku:z.string().trim().min(1).max(100),name,model_number:text.optional(),category_id:idSchema.nullish(),description:text.optional(),specifications:text.optional(),hsn_code:text.optional(),is_active:z.boolean().optional()});
export const pricesSchema=z.record(idSchema,money);
export const userSchema=z.object({full_name:name,email:z.string().trim().email().max(254).transform(v=>v.toLowerCase()),role:z.enum(['admin','team_member']),password:z.string().min(12).max(72).refine(v=>new TextEncoder().encode(v).length<=72,'Password must not exceed 72 UTF-8 bytes')});
const bankAccountSchema=z.object({bank_name:text,account_name:text,account_no:text,ifsc:text,branch:text.optional(),swift:text.optional()});
const quotationChargeSchema=z.enum(QUOTATION_CHARGE_FIELDS);
const quotationClauseSchema=z.object({title:name,text:z.string().trim().min(1).max(5000)});
export const settingsSchema=z.object({id:z.literal('company'),company_name:name,company_tagline:text.optional(),logo_path:z.union([z.string().regex(/^\/brand\/[A-Za-z0-9._-]+$/),z.literal('')]).optional(),terms_template_version:text.optional(),address:text,email:z.union([z.string().email(),z.literal('')]),phone:text,website:text.optional(),gstin:text,bank_name:text,bank_account_name:text,bank_account_no:text,bank_ifsc:text,bank_swift:text.optional(),bank_branch:text.optional(),bank_accounts:z.array(bankAccountSchema).max(4).optional(),payment_terms_default:text,delivery_terms_default:text,warranty_terms_default:text,validity_days_default:z.number().int().min(1).max(365),freight_terms_default:text,quotation_prefix:z.string().regex(/^[A-Za-z0-9/-]{1,30}$/),default_notes:text.optional(),revision:z.number().int().positive().optional()});
export const quoteFormSchema=z.object({
 quotation_number:z.string().trim().max(100).regex(/^[^\u0000-\u001f\u007f]*$/,'Reference number must be a single line').optional(),
 customer_id:idSchema,quotation_type:z.enum(['indian','export']).default('indian'),price_list_id:idSchema,currency:z.enum(['INR','USD','EUR','GBP','AED']),exchange_rate:exchangeRate.default(1),quotation_date:date,valid_until:date,
 items:z.array(z.object({product_id:idSchema,description:text.optional(),master_price:money,source_master_price:money.optional(),unit_price:money,quantity:z.number().finite().positive().max(1000000).refine(v=>new Decimal(v).decimalPlaces()<=3,'Quantity supports three decimal places'),discount_percent:percent})).min(1).max(500),
 packaging_charges:money,freight_charges:money,insurance_charges:money,other_charges:money,discount_amount:money.default(0),tax_percent:percent,
 visible_charges:z.array(quotationChargeSchema).max(QUOTATION_CHARGE_FIELDS.length).refine(values=>new Set(values).size===values.length,'Commercial charge rows must be unique').optional(),
 additional_clauses:z.array(quotationClauseSchema).max(30).optional(),
 payment_terms:text,delivery_terms:text,warranty_terms:text,validity_terms:text,freight_terms:text,customer_reference:text.optional(),customer_enquiry_date:z.union([date,z.literal('')]).optional(),notes:text.optional()
}).refine(v=>v.valid_until>=v.quotation_date,'Valid until must not precede the quotation date').refine(v=>new Set(v.items.map(i=>i.product_id)).size===v.items.length,'Duplicate products are not allowed');
export class AppError extends Error {constructor(public status:number,message:string){super(message);}}
