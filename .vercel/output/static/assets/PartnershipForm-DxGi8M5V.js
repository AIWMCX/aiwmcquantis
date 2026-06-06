import{r as p,j as e}from"./ui-vendor-Ci_jhfUT.js";import{u as D,z as i}from"./forms-5vTbOgwK.js";import{t as I}from"./zod-DDx_hEyQ.js";import{c as V,d as m,f as d,g as h,ai as v,e as x,I as o,ak as q,F as M,an as O}from"./index-C7JpK5Nd.js";import{T as l}from"./textarea-CJbm1bUG.js";import{L as a}from"./label-DUkIsdlE.js";import{S as N,a as A,b as E,c as w,d as y}from"./select-Bk9iz0XS.js";import{u as H,A as W}from"./useDocFormDraft-Bud_LrlS.js";import{A as S}from"./AISuggestionButton-BhvECRL_.js";import{e as Y,s as L}from"./DocsStudio-Cr5akC9A.js";import{B as J}from"./building-2-BmuadVeQ.js";import"./supabase-vendor-BXGp3RFH.js";import"./query-vendor-ouN-jH5-.js";import"./react-vendor-CtFdHvrH.js";import"./chevron-down-BeAFGtZg.js";import"./chevron-up-DucWRmDp.js";import"./dialog-CtleFdjJ.js";import"./calendar-Bqj7sfJ9.js";import"./alert-dialog-BKxEo4on.js";import"./plus-C_Wh3IXV.js";import"./search-C6zDNM-a.js";import"./copy-DiM9sxD_.js";import"./trash-2-BotGUTT-.js";import"./date-utils-BcDumrce.js";import"./tabs-DKrhxIhe.js";import"./scale-DXtEBmWV.js";import"./eye-off-iRplz8OT.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const G=V("Handshake",[["path",{d:"m11 17 2 2a1 1 0 1 0 3-3",key:"efffak"}],["path",{d:"m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4",key:"9pr0kb"}],["path",{d:"m21 3 1 11h-2",key:"1tisrp"}],["path",{d:"M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3",key:"1uvwmv"}],["path",{d:"M3 4h8",key:"1ep09j"}]]),K=i.object({your_company_name:i.string().min(1,"Company name is required"),your_company_address:i.string().min(1,"Address is required"),your_contact_name:i.string().min(1,"Contact name is required"),your_contact_email:i.string().email("Valid email required"),your_contact_title:i.string().min(1,"Title is required"),partner_company_name:i.string().min(1,"Partner company name is required"),partner_company_address:i.string().optional(),partner_contact_name:i.string().optional(),partner_contact_email:i.string().optional(),partnership_type:i.enum(["strategic","distribution","technology","marketing","referral","joint_venture"]),partnership_objective:i.string().min(10,"Please describe the partnership objective"),value_proposition:i.string().min(10,"Please describe the value proposition"),revenue_share_percent:i.number().min(0).max(100).optional(),duration_months:i.number().min(1).max(120).optional(),exclusivity:i.enum(["exclusive","non_exclusive","semi_exclusive"]),territory:i.string().optional(),your_responsibilities:i.string().min(10,"Please describe your responsibilities"),partner_responsibilities:i.string().min(10,"Please describe partner responsibilities"),success_metrics:i.string().optional(),effective_date:i.string().optional(),special_terms:i.string().optional()}),C=[{value:"strategic",label:"Strategic Alliance"},{value:"distribution",label:"Distribution Partnership"},{value:"technology",label:"Technology Partnership"},{value:"marketing",label:"Co-Marketing Partnership"},{value:"referral",label:"Referral Partnership"},{value:"joint_venture",label:"Joint Venture"}];function Ee({template:Q,onGenerate:P,onPreviewUpdate:u,isGenerating:X}){const s=D({resolver:I(K),defaultValues:{your_company_name:"",your_company_address:"",your_contact_name:"",your_contact_email:"",your_contact_title:"",partner_company_name:"",partner_company_address:"",partner_contact_name:"",partner_contact_email:"",partnership_type:"strategic",partnership_objective:"",value_proposition:"",revenue_share_percent:void 0,duration_months:24,exclusivity:"non_exclusive",territory:"Worldwide",your_responsibilities:"",partner_responsibilities:"",success_metrics:"",effective_date:new Date().toISOString().split("T")[0],special_terms:""}}),{setValue:n,handleSubmit:T,formState:{errors:_}}=s;H({form:s,templateId:"partnership-proposal"});const j=p.useRef(s.getValues()),c=p.useRef();p.useEffect(()=>{const t=s.watch(r=>{j.current=r,c.current&&clearTimeout(c.current),c.current=setTimeout(()=>{b(j.current)},300)});return b(s.getValues()),()=>{t.unsubscribe(),c.current&&clearTimeout(c.current)}},[s,u]);const b=p.useCallback(t=>{const r=Y(t),R=`
      <div style="font-family: 'DM Sans', 'Inter', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a1a; line-height: 1.8;">
        <div style="text-align: center; margin-bottom: 40px; border-bottom: 3px solid #3B82F6; padding-bottom: 20px;">
          <h1 style="font-family: 'Sora', sans-serif; font-size: 28px; margin: 0 0 8px 0; color: #0F172A; letter-spacing: -0.02em;">PARTNERSHIP PROPOSAL</h1>
          <p style="color: #64748B; margin: 0; font-size: 14px;">${C.find(B=>B.value===r.partnership_type)?.label||r.partnership_type}</p>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px;">
          <div style="padding: 20px; background: #F8FAFC; border-radius: 8px;">
            <h3 style="font-size: 12px; color: #64748B; margin: 0 0 8px 0; text-transform: uppercase;">From</h3>
            <p style="font-weight: 600; margin: 0 0 4px 0; color: #0F172A;">${r.your_company_name||"[Your Company]"}</p>
            <p style="font-size: 13px; color: #475569; margin: 0;">${r.your_contact_name||"[Contact Name]"}</p>
            <p style="font-size: 13px; color: #475569; margin: 0;">${r.your_contact_title||"[Title]"}</p>
          </div>
          <div style="padding: 20px; background: #F8FAFC; border-radius: 8px;">
            <h3 style="font-size: 12px; color: #64748B; margin: 0 0 8px 0; text-transform: uppercase;">To</h3>
            <p style="font-weight: 600; margin: 0 0 4px 0; color: #0F172A;">${r.partner_company_name||"[Partner Company]"}</p>
            <p style="font-size: 13px; color: #475569; margin: 0;">${r.partner_contact_name||""}</p>
          </div>
        </div>
        
        <section style="margin-bottom: 32px;">
          <h2 style="font-family: 'Sora', sans-serif; font-size: 18px; color: #0F172A; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px; margin-bottom: 16px;">Partnership Objective</h2>
          <p style="line-height: 1.7; color: #334155;">${r.partnership_objective||"[Describe the main objective of this partnership]"}</p>
        </section>
        
        <section style="margin-bottom: 32px;">
          <h2 style="font-family: 'Sora', sans-serif; font-size: 18px; color: #0F172A; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px; margin-bottom: 16px;">Value Proposition</h2>
          <p style="line-height: 1.7; color: #334155;">${r.value_proposition||"[Describe the mutual value proposition]"}</p>
        </section>
        
        <section style="margin-bottom: 32px;">
          <h2 style="font-family: 'Sora', sans-serif; font-size: 18px; color: #0F172A; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px; margin-bottom: 16px;">Proposed Terms</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #E2E8F0;">
              <td style="padding: 12px 0; color: #64748B; width: 40%;">Duration</td>
              <td style="padding: 12px 0; color: #0F172A; font-weight: 500;">${r.duration_months||24} months</td>
            </tr>
            <tr style="border-bottom: 1px solid #E2E8F0;">
              <td style="padding: 12px 0; color: #64748B;">Exclusivity</td>
              <td style="padding: 12px 0; color: #0F172A; font-weight: 500;">${r.exclusivity==="exclusive"?"Exclusive":r.exclusivity==="semi_exclusive"?"Semi-Exclusive":"Non-Exclusive"}</td>
            </tr>
            <tr style="border-bottom: 1px solid #E2E8F0;">
              <td style="padding: 12px 0; color: #64748B;">Territory</td>
              <td style="padding: 12px 0; color: #0F172A; font-weight: 500;">${r.territory||"Worldwide"}</td>
            </tr>
            ${r.revenue_share_percent?`
            <tr style="border-bottom: 1px solid #E2E8F0;">
              <td style="padding: 12px 0; color: #64748B;">Revenue Share</td>
              <td style="padding: 12px 0; color: #0F172A; font-weight: 500;">${r.revenue_share_percent}%</td>
            </tr>`:""}
          </table>
        </section>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px;">
          <section>
            <h2 style="font-size: 16px; color: #0F172A; margin-bottom: 12px;">Our Responsibilities</h2>
            <div style="padding: 16px; background: #EFF6FF; border-radius: 8px; border-left: 3px solid #3B82F6;">
              <p style="margin: 0; font-size: 14px; color: #1E40AF; line-height: 1.6;">${r.your_responsibilities||"[Your responsibilities]"}</p>
            </div>
          </section>
          <section>
            <h2 style="font-size: 16px; color: #0F172A; margin-bottom: 12px;">Partner Responsibilities</h2>
            <div style="padding: 16px; background: #F0FDF4; border-radius: 8px; border-left: 3px solid #10B981;">
              <p style="margin: 0; font-size: 14px; color: #166534; line-height: 1.6;">${r.partner_responsibilities||"[Partner responsibilities]"}</p>
            </div>
          </section>
        </div>
        
        ${r.success_metrics?`
        <section style="margin-bottom: 32px;">
          <h2 style="font-size: 18px; color: #0F172A; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px; margin-bottom: 16px;">Success Metrics</h2>
          <p style="line-height: 1.7; color: #334155;">${r.success_metrics}</p>
        </section>`:""}
        
        ${r.special_terms?`
        <section style="margin-bottom: 32px;">
          <h2 style="font-size: 18px; color: #0F172A; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px; margin-bottom: 16px;">Additional Terms</h2>
          <p style="line-height: 1.7; color: #334155;">${r.special_terms}</p>
        </section>`:""}
        
        <footer style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #E2E8F0; text-align: center; color: #94A3B8; font-size: 11px;">
          Generated with AIWMC Quantis | aiwmcquantis.com
        </footer>
      </div>
    `;u(L(R))},[u]),g=s.watch("partnership_type"),z=s.watch("exclusivity"),f=s.watch("your_company_name"),F=s.watch("partner_company_name"),k=p.useCallback(t=>{t.company_name&&n("your_company_name",String(t.company_name)),t.location&&n("your_company_address",String(t.location))},[n]),$=t=>{P(t)};return e.jsxs("form",{onSubmit:T($),className:"space-y-6",children:[e.jsx(W,{onAutoFill:k}),e.jsxs(m,{className:"doc-section-card",children:[e.jsxs(d,{children:[e.jsxs(h,{className:"flex items-center gap-2 text-lg",children:[e.jsx(J,{className:"w-5 h-5 text-primary"}),"Your Company"]}),e.jsx(v,{children:"Your organization details"})]}),e.jsxs(x,{className:"space-y-4",children:[e.jsxs("div",{className:"grid gap-4 sm:grid-cols-2",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(a,{htmlFor:"your_company_name",children:"Company Name *"}),e.jsx(o,{id:"your_company_name",...s.register("your_company_name"),placeholder:"Your Company Inc.","aria-invalid":!!_.your_company_name}),_.your_company_name&&e.jsx("p",{className:"text-sm text-destructive",children:_.your_company_name.message})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(a,{htmlFor:"your_company_address",children:"Address *"}),e.jsx(o,{id:"your_company_address",...s.register("your_company_address"),placeholder:"123 Business Ave, City, State"})]})]}),e.jsxs("div",{className:"grid gap-4 sm:grid-cols-3",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(a,{htmlFor:"your_contact_name",children:"Contact Name *"}),e.jsx(o,{id:"your_contact_name",...s.register("your_contact_name"),placeholder:"John Smith"})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(a,{htmlFor:"your_contact_title",children:"Title *"}),e.jsx(o,{id:"your_contact_title",...s.register("your_contact_title"),placeholder:"CEO"})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(a,{htmlFor:"your_contact_email",children:"Email *"}),e.jsx(o,{id:"your_contact_email",type:"email",...s.register("your_contact_email"),placeholder:"john@company.com"})]})]})]})]}),e.jsxs(m,{className:"doc-section-card",children:[e.jsxs(d,{children:[e.jsxs(h,{className:"flex items-center gap-2 text-lg",children:[e.jsx(q,{className:"w-5 h-5 text-primary"}),"Partner Company"]}),e.jsx(v,{children:"Prospective partner details"})]}),e.jsxs(x,{className:"space-y-4",children:[e.jsxs("div",{className:"grid gap-4 sm:grid-cols-2",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(a,{htmlFor:"partner_company_name",children:"Company Name *"}),e.jsx(o,{id:"partner_company_name",...s.register("partner_company_name"),placeholder:"Partner Corp"})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(a,{htmlFor:"partner_company_address",children:"Address"}),e.jsx(o,{id:"partner_company_address",...s.register("partner_company_address"),placeholder:"456 Partner St, City, State"})]})]}),e.jsxs("div",{className:"grid gap-4 sm:grid-cols-2",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(a,{htmlFor:"partner_contact_name",children:"Contact Name"}),e.jsx(o,{id:"partner_contact_name",...s.register("partner_contact_name"),placeholder:"Jane Doe"})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(a,{htmlFor:"partner_contact_email",children:"Contact Email"}),e.jsx(o,{id:"partner_contact_email",type:"email",...s.register("partner_contact_email"),placeholder:"jane@partner.com"})]})]})]})]}),e.jsxs(m,{className:"doc-section-card",children:[e.jsxs(d,{children:[e.jsxs(h,{className:"flex items-center gap-2 text-lg",children:[e.jsx(G,{className:"w-5 h-5 text-primary"}),"Partnership Details"]}),e.jsx(v,{children:"Define the partnership scope and objectives"})]}),e.jsxs(x,{className:"space-y-4",children:[e.jsxs("div",{className:"grid gap-4 sm:grid-cols-2",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(a,{htmlFor:"partnership_type",children:"Partnership Type *"}),e.jsxs(N,{value:g,onValueChange:t=>n("partnership_type",t),children:[e.jsx(A,{id:"partnership_type",children:e.jsx(E,{})}),e.jsx(w,{children:C.map(t=>e.jsx(y,{value:t.value,children:t.label},t.value))})]})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(a,{htmlFor:"effective_date",children:"Effective Date"}),e.jsx(o,{id:"effective_date",type:"date",...s.register("effective_date")})]})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx(a,{htmlFor:"partnership_objective",children:"Partnership Objective *"}),e.jsx(S,{sectionType:"partnership_objective",context:{company_name:f,partner_name:F,partnership_type:g},onApply:t=>n("partnership_objective",t)})]}),e.jsx(l,{id:"partnership_objective",...s.register("partnership_objective"),placeholder:"Describe the main goals and objectives of this partnership...",rows:4})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx(a,{htmlFor:"value_proposition",children:"Value Proposition *"}),e.jsx(S,{sectionType:"value_proposition",context:{company_name:f,partner_name:F,partnership_type:g},onApply:t=>n("value_proposition",t)})]}),e.jsx(l,{id:"value_proposition",...s.register("value_proposition"),placeholder:"What value does this partnership create for both parties?",rows:4})]})]})]}),e.jsxs(m,{className:"doc-section-card",children:[e.jsx(d,{children:e.jsxs(h,{className:"flex items-center gap-2 text-lg",children:[e.jsx(M,{className:"w-5 h-5 text-primary"}),"Proposed Terms"]})}),e.jsx(x,{className:"space-y-4",children:e.jsxs("div",{className:"grid gap-4 sm:grid-cols-2 lg:grid-cols-4",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(a,{htmlFor:"duration_months",children:"Duration (months)"}),e.jsx(o,{id:"duration_months",type:"number",...s.register("duration_months",{valueAsNumber:!0}),min:1,max:120})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(a,{htmlFor:"exclusivity",children:"Exclusivity"}),e.jsxs(N,{value:z,onValueChange:t=>n("exclusivity",t),children:[e.jsx(A,{id:"exclusivity",children:e.jsx(E,{})}),e.jsxs(w,{children:[e.jsx(y,{value:"non_exclusive",children:"Non-Exclusive"}),e.jsx(y,{value:"semi_exclusive",children:"Semi-Exclusive"}),e.jsx(y,{value:"exclusive",children:"Exclusive"})]})]})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(a,{htmlFor:"territory",children:"Territory"}),e.jsx(o,{id:"territory",...s.register("territory"),placeholder:"Worldwide"})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(a,{htmlFor:"revenue_share_percent",children:"Revenue Share %"}),e.jsx(o,{id:"revenue_share_percent",type:"number",...s.register("revenue_share_percent",{valueAsNumber:!0}),min:0,max:100,placeholder:"Optional"})]})]})})]}),e.jsxs(m,{className:"doc-section-card",children:[e.jsx(d,{children:e.jsxs(h,{className:"flex items-center gap-2 text-lg",children:[e.jsx(O,{className:"w-5 h-5 text-primary"}),"Responsibilities"]})}),e.jsxs(x,{className:"space-y-4",children:[e.jsxs("div",{className:"grid gap-4 lg:grid-cols-2",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(a,{htmlFor:"your_responsibilities",children:"Your Responsibilities *"}),e.jsx(l,{id:"your_responsibilities",...s.register("your_responsibilities"),placeholder:"What your company will provide and deliver...",rows:4})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(a,{htmlFor:"partner_responsibilities",children:"Partner Responsibilities *"}),e.jsx(l,{id:"partner_responsibilities",...s.register("partner_responsibilities"),placeholder:"What you expect from the partner...",rows:4})]})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(a,{htmlFor:"success_metrics",children:"Success Metrics"}),e.jsx(l,{id:"success_metrics",...s.register("success_metrics"),placeholder:"How will partnership success be measured? (KPIs, milestones, etc.)",rows:3})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(a,{htmlFor:"special_terms",children:"Additional Terms"}),e.jsx(l,{id:"special_terms",...s.register("special_terms"),placeholder:"Any special conditions or requirements...",rows:3})]})]})]})]})}export{Ee as PartnershipForm};
//# sourceMappingURL=PartnershipForm-DxGi8M5V.js.map
