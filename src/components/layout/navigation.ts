import {LayoutDashboard,FilePlus2,FileText,Package,Tags,Users,Settings,ShieldCheck,Upload,FolderTree} from 'lucide-react';
export const navigation=[
 {title:'Dashboard',description:'Overview and shortcuts',href:'/dashboard',icon:LayoutDashboard,section:'Workspace'},
 {title:'Create Quotation',description:'Build a customer offer',href:'/quotations/new',icon:FilePlus2,section:'Workspace'},
 {title:'Quotations',description:'History and downloads',href:'/quotations',icon:FileText,section:'Workspace'},
 {title:'Products',description:'Equipment and specifications',href:'/products',icon:Package,section:'Catalog & customers'},
 {title:'Price Lists',description:'Master pricing schedules',href:'/price-lists',icon:Tags,section:'Catalog & customers',adminOnly:true},
 {title:'Customers',description:'Companies and contacts',href:'/customers',icon:Users,section:'Catalog & customers'},
 {title:'Users',description:'Team access and roles',href:'/users',icon:ShieldCheck,section:'Administration',adminOnly:true},
 {title:'Settings',description:'Company and document defaults',href:'/settings',icon:Settings,section:'Administration',adminOnly:true},
];
export const catalogNavigation=[{title:'Categories',description:'Organize the catalog',href:'/products/categories',icon:FolderTree,section:'Catalog',adminOnly:true},{title:'Import prices',description:'Upload and review changes',href:'/products/import',icon:Upload,section:'Catalog',adminOnly:true}];
export function navIsActive(path:string,href:string){if(href==='/quotations')return path.startsWith(href)&&path!=='/quotations/new';if(href==='/products')return path==='/products';return path===href;}
