import {LayoutDashboard,FilePlus2,FileText,Package,Tags,Users,Settings,ShieldCheck,Upload,FolderTree} from 'lucide-react';
export const navigation=[
 {title:'Dashboard',href:'/dashboard',icon:LayoutDashboard,section:'Workspace'},
 {title:'Create Quotation',href:'/quotations/new',icon:FilePlus2,section:'Workspace'},
 {title:'Quotations',href:'/quotations',icon:FileText,section:'Workspace'},
 {title:'Products',href:'/products',icon:Package,section:'Catalog & customers'},
 {title:'Price Lists',href:'/price-lists',icon:Tags,section:'Catalog & customers',adminOnly:true},
 {title:'Customers',href:'/customers',icon:Users,section:'Catalog & customers'},
 {title:'Users',href:'/users',icon:ShieldCheck,section:'Administration',adminOnly:true},
 {title:'Settings',href:'/settings',icon:Settings,section:'Administration',adminOnly:true},
];
export const catalogNavigation=[{title:'Categories',href:'/products/categories',icon:FolderTree,section:'Catalog',adminOnly:true},{title:'Import prices',href:'/products/import',icon:Upload,section:'Catalog',adminOnly:true}];
export function navIsActive(path:string,href:string){if(href==='/quotations')return path.startsWith(href)&&path!=='/quotations/new';if(href==='/products')return path==='/products';return path===href;}
