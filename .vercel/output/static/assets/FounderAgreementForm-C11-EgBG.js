import{r as d,j as e}from"./ui-vendor-Ci_jhfUT.js";import{u as oe,a as ie,z as o}from"./forms-5vTbOgwK.js";import{t as ne}from"./zod-DDx_hEyQ.js";import{d as g,f as h,g as x,S as re,e as u,I as r,ak as ae,ai as le,B as T,C as ce,w as de}from"./index-C7JpK5Nd.js";import{T as me}from"./textarea-CJbm1bUG.js";import{L as i}from"./label-DUkIsdlE.js";import{S as v,a as N,b as E,c as F,d as l}from"./select-Bk9iz0XS.js";import{C as c}from"./checkbox-CTc9PzZ0.js";import{u as pe,A as ge}from"./useDocFormDraft-Bud_LrlS.js";import{D as he}from"./DocDraftBanner-WLCzG5c7.js";import{e as xe,s as ue}from"./DocsStudio-Cr5akC9A.js";import{T as _e}from"./trash-2-BotGUTT-.js";import{P as fe}from"./plus-C_Wh3IXV.js";import{C as ye}from"./chart-pie-DMbixSaY.js";import"./supabase-vendor-BXGp3RFH.js";import"./query-vendor-ouN-jH5-.js";import"./react-vendor-CtFdHvrH.js";import"./chevron-down-BeAFGtZg.js";import"./chevron-up-DucWRmDp.js";import"./dialog-CtleFdjJ.js";import"./calendar-Bqj7sfJ9.js";import"./rotate-ccw-Y5oj2zEL.js";import"./alert-dialog-BKxEo4on.js";import"./search-C6zDNM-a.js";import"./copy-DiM9sxD_.js";import"./date-utils-BcDumrce.js";import"./tabs-DKrhxIhe.js";import"./scale-DXtEBmWV.js";import"./eye-off-iRplz8OT.js";const be=o.object({name:o.string().min(1,"Name required"),email:o.string().email("Valid email required"),role:o.string().min(1,"Role required"),equity_percent:o.number().min(0).max(100),vesting_months:o.number().min(0).max(60),cliff_months:o.number().min(0).max(24)}),je=o.object({company_name:o.string().min(1,"Company name is required"),company_type:o.enum(["llc","c_corp","s_corp","partnership","sole_prop"]),state_of_incorporation:o.string().min(2,"State required"),founders:o.array(be).min(1,"At least one founder required"),standard_vesting_months:o.number().min(12).max(60),standard_cliff_months:o.number().min(0).max(24),acceleration_on_exit:o.boolean(),acceleration_on_termination:o.boolean(),ip_assignment:o.boolean(),non_compete_months:o.number().min(0).max(36),non_solicit_months:o.number().min(0).max(36),voting_threshold:o.number().min(50).max(100),major_decisions_require_unanimous:o.boolean(),drag_along:o.boolean(),tag_along:o.boolean(),right_of_first_refusal:o.boolean(),good_leaver_buyback:o.boolean(),bad_leaver_buyback:o.boolean(),buyback_price_method:o.enum(["fair_market_value","cost_basis","formula"]),effective_date:o.string(),governing_law_state:o.string(),dispute_resolution:o.enum(["arbitration","litigation","mediation_first"]),additional_terms:o.string().optional()});function tt({template:ve,onGenerate:q,onPreviewUpdate:C,isGenerating:Ne}){const s=oe({resolver:ne(je),defaultValues:{company_name:"",company_type:"llc",state_of_incorporation:"",founders:[{name:"",email:"",role:"CEO",equity_percent:50,vesting_months:48,cliff_months:12},{name:"",email:"",role:"CTO",equity_percent:50,vesting_months:48,cliff_months:12}],standard_vesting_months:48,standard_cliff_months:12,acceleration_on_exit:!0,acceleration_on_termination:!1,ip_assignment:!0,non_compete_months:12,non_solicit_months:24,voting_threshold:51,major_decisions_require_unanimous:!0,drag_along:!0,tag_along:!0,right_of_first_refusal:!0,good_leaver_buyback:!0,bad_leaver_buyback:!0,buyback_price_method:"fair_market_value",effective_date:new Date().toISOString().split("T")[0],governing_law_state:"",dispute_resolution:"arbitration",additional_terms:""}}),{setValue:a,handleSubmit:R,formState:{errors:Ee},control:I}=s,{fields:A,append:w,remove:L}=ie({control:I,name:"founders"}),{hasDraft:V,draftAge:z,isSaving:B,lastSaved:P,restoreDraft:M,dismissDraft:D}=pe({form:s,templateId:"founder-agreement"}),S=d.useRef(s.getValues()),m=d.useRef(),k=d.useCallback(t=>t.reduce((n,_)=>n+(_.equity_percent||0),0),[]),y=d.useCallback(t=>{const n=xe(t),_=k(t.founders),$=Math.abs(_-100)<.01,te={llc:"Limited Liability Company",c_corp:"C Corporation",s_corp:"S Corporation",partnership:"Partnership",sole_prop:"Sole Proprietorship"}[n.company_type],se=`
      <div style="font-family: 'DM Sans', 'Inter', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a1a; line-height: 1.8;">
        <div style="text-align: center; margin-bottom: 40px; border-bottom: 3px solid #7C3AED; padding-bottom: 20px;">
          <h1 style="font-family: 'Sora', sans-serif; font-size: 24px; margin: 0 0 8px 0; color: #0F172A; letter-spacing: -0.02em;">FOUNDER'S AGREEMENT</h1>
          <p style="color: #64748B; margin: 0; font-size: 14px;">${n.company_name||"[Company Name]"}</p>
        </div>
        
        <p style="line-height: 1.8; margin-bottom: 24px;">
          This Founder's Agreement ("Agreement") is entered into as of <strong>${n.effective_date||"[Date]"}</strong>
          by and among the undersigned founders of <strong>${n.company_name||"[Company Name]"}</strong>,
          a ${te} organized under the laws of the State of <strong>${n.state_of_incorporation||"[State]"}</strong>.
        </p>
        
        <section style="margin-bottom: 32px;">
          <h2 style="font-family: 'Sora', sans-serif; font-size: 18px; color: #0F172A; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px; margin-bottom: 16px;">1. FOUNDERS & EQUITY DISTRIBUTION</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background: #F8FAFC;">
                <th style="padding: 12px; text-align: left; border: 1px solid #E2E8F0;">Founder</th>
                <th style="padding: 12px; text-align: left; border: 1px solid #E2E8F0;">Role</th>
                <th style="padding: 12px; text-align: center; border: 1px solid #E2E8F0;">Equity %</th>
                <th style="padding: 12px; text-align: center; border: 1px solid #E2E8F0;">Vesting</th>
                <th style="padding: 12px; text-align: center; border: 1px solid #E2E8F0;">Cliff</th>
              </tr>
            </thead>
            <tbody>
              ${n.founders.map((p,f)=>`
                <tr>
                  <td style="padding: 12px; border: 1px solid #E2E8F0;">${p.name||`Founder ${f+1}`}</td>
                  <td style="padding: 12px; border: 1px solid #E2E8F0;">${p.role||"-"}</td>
                  <td style="padding: 12px; border: 1px solid #E2E8F0; text-align: center; font-weight: 600; font-family: 'JetBrains Mono', monospace;">${t.founders[f]?.equity_percent||0}%</td>
                  <td style="padding: 12px; border: 1px solid #E2E8F0; text-align: center;">${t.founders[f]?.vesting_months||0} mo</td>
                  <td style="padding: 12px; border: 1px solid #E2E8F0; text-align: center;">${t.founders[f]?.cliff_months||0} mo</td>
                </tr>
              `).join("")}
              <tr style="background: ${$?"#F0FDF4":"#FEF2F2"};">
                <td colspan="2" style="padding: 12px; border: 1px solid #E2E8F0; font-weight: 600;">Total</td>
                <td style="padding: 12px; border: 1px solid #E2E8F0; text-align: center; font-weight: 700; color: ${$?"#16A34A":"#DC2626"}; font-family: 'JetBrains Mono', monospace;">${_}%</td>
                <td colspan="2" style="padding: 12px; border: 1px solid #E2E8F0;"></td>
              </tr>
            </tbody>
          </table>
        </section>
        
        <section style="margin-bottom: 32px;">
          <h2 style="font-family: 'Sora', sans-serif; font-size: 18px; color: #0F172A; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px; margin-bottom: 16px;">2. VESTING SCHEDULE</h2>
          <ul style="padding-left: 20px; line-height: 1.8;">
            <li>Standard vesting period: <strong>${t.standard_vesting_months} months</strong></li>
            <li>Cliff period: <strong>${t.standard_cliff_months} months</strong></li>
            <li>Acceleration on exit: <strong>${t.acceleration_on_exit?"Yes (100% acceleration)":"No"}</strong></li>
            <li>Acceleration on termination without cause: <strong>${t.acceleration_on_termination?"Yes":"No"}</strong></li>
          </ul>
        </section>
        
        <section style="margin-bottom: 32px;">
          <h2 style="font-family: 'Sora', sans-serif; font-size: 18px; color: #0F172A; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px; margin-bottom: 16px;">3. INTELLECTUAL PROPERTY</h2>
          <p style="line-height: 1.8;">
            ${t.ip_assignment?"All founders agree to assign all intellectual property created for or relating to the Company to the Company.":"IP assignment terms to be negotiated separately."}
          </p>
          <p style="line-height: 1.8; margin-top: 12px;">
            <strong>Non-Compete Period:</strong> ${t.non_compete_months} months after departure<br/>
            <strong>Non-Solicitation Period:</strong> ${t.non_solicit_months} months after departure
          </p>
        </section>
        
        <section style="margin-bottom: 32px;">
          <h2 style="font-family: 'Sora', sans-serif; font-size: 18px; color: #0F172A; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px; margin-bottom: 16px;">4. DECISION MAKING</h2>
          <ul style="padding-left: 20px; line-height: 1.8;">
            <li>Voting threshold for ordinary decisions: <strong>${t.voting_threshold}%</strong></li>
            <li>Major decisions require unanimous consent: <strong>${t.major_decisions_require_unanimous?"Yes":"No"}</strong></li>
          </ul>
        </section>
        
        <section style="margin-bottom: 32px;">
          <h2 style="font-family: 'Sora', sans-serif; font-size: 18px; color: #0F172A; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px; margin-bottom: 16px;">5. EXIT PROVISIONS</h2>
          <ul style="padding-left: 20px; line-height: 1.8;">
            <li>Drag-Along Rights: <strong>${t.drag_along?"Enabled":"Disabled"}</strong></li>
            <li>Tag-Along Rights: <strong>${t.tag_along?"Enabled":"Disabled"}</strong></li>
            <li>Right of First Refusal: <strong>${t.right_of_first_refusal?"Enabled":"Disabled"}</strong></li>
          </ul>
        </section>
        
        <section style="margin-bottom: 32px;">
          <h2 style="font-family: 'Sora', sans-serif; font-size: 18px; color: #0F172A; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px; margin-bottom: 16px;">6. FOUNDER DEPARTURE</h2>
          <p style="line-height: 1.8;">
            <strong>Good Leaver:</strong> ${t.good_leaver_buyback?"Company may repurchase unvested shares":"No buyback provision"}<br/>
            <strong>Bad Leaver:</strong> ${t.bad_leaver_buyback?"Company may repurchase all shares (vested and unvested)":"No buyback provision"}<br/>
            <strong>Buyback Price:</strong> ${t.buyback_price_method==="fair_market_value"?"Fair Market Value":t.buyback_price_method==="cost_basis"?"Original Cost Basis":"Formula-based"}
          </p>
        </section>
        
        <section style="margin-bottom: 32px;">
          <h2 style="font-family: 'Sora', sans-serif; font-size: 18px; color: #0F172A; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px; margin-bottom: 16px;">7. GOVERNING LAW & DISPUTES</h2>
          <p style="line-height: 1.8;">
            This Agreement shall be governed by the laws of the State of <strong>${n.governing_law_state||"[State]"}</strong>.<br/>
            Dispute resolution method: <strong>${t.dispute_resolution==="arbitration"?"Binding Arbitration":t.dispute_resolution==="litigation"?"Court Litigation":"Mediation, then Arbitration"}</strong>
          </p>
        </section>
        
        ${n.additional_terms?`
        <section style="margin-bottom: 32px;">
          <h2 style="font-family: 'Sora', sans-serif; font-size: 18px; color: #0F172A; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px; margin-bottom: 16px;">8. ADDITIONAL TERMS</h2>
          <p style="line-height: 1.8;">${n.additional_terms}</p>
        </section>`:""}
        
        <section style="margin-top: 60px; padding-top: 40px; border-top: 2px solid #E2E8F0;">
          <h2 style="font-size: 18px; color: #0F172A; margin-bottom: 24px;">SIGNATURES</h2>
          ${n.founders.map(p=>`
            <div style="display: inline-block; width: 45%; margin-right: 5%; margin-bottom: 40px;">
              <div style="border-bottom: 1px solid #000; margin-bottom: 8px; height: 40px;"></div>
              <p style="margin: 0; font-size: 14px;"><strong>${p.name||"________________"}</strong></p>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748B;">${p.role||"Founder"}</p>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748B;">Date: ________________</p>
            </div>
          `).join("")}
        </section>
        
        <div style="margin-top: 40px; padding: 16px; background: #FEF3C7; border-radius: 8px; border-left: 4px solid #F59E0B;">
          <p style="margin: 0; font-size: 12px; color: #92400E;">
            <strong>LEGAL DISCLAIMER:</strong> This template is provided for informational purposes only and does not constitute legal advice. 
            Consult with a qualified attorney before executing any legal agreement.
          </p>
        </div>
        
        <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #E2E8F0; text-align: center; color: #94A3B8; font-size: 11px;">
          Generated with AIWMC Quantis | aiwmcquantis.com
        </footer>
      </div>
    `;C(ue(se))},[C,k]);d.useEffect(()=>{const t=s.watch(n=>{S.current=n,m.current&&clearTimeout(m.current),m.current=setTimeout(()=>{y(S.current)},300)});return y(s.getValues()),()=>{t.unsubscribe(),m.current&&clearTimeout(m.current)}},[s,y]);const O=s.watch("company_type"),G=s.watch("buyback_price_method"),U=s.watch("dispute_resolution"),Y=s.watch("acceleration_on_exit"),H=s.watch("acceleration_on_termination"),J=s.watch("ip_assignment"),Q=s.watch("drag_along"),W=s.watch("tag_along"),K=s.watch("right_of_first_refusal"),X=s.watch("major_decisions_require_unanimous"),b=s.watch("founders").reduce((t,n)=>t+(n.equity_percent||0),0),j=Math.abs(b-100)<.01,Z=d.useCallback(t=>{t.company_name&&a("company_name",String(t.company_name)),t.location&&a("state_of_incorporation",String(t.location).split(",").pop()?.trim()||"")},[a]),ee=t=>{q(t)};return e.jsxs("form",{onSubmit:R(ee),className:"space-y-6",children:[e.jsx(he,{hasDraft:V,draftAge:z,isSaving:B,lastSaved:P,onRestore:M,onDismiss:D}),e.jsx(ge,{onAutoFill:Z}),e.jsxs(g,{className:"doc-section-card",children:[e.jsx(h,{children:e.jsxs(x,{className:"flex items-center gap-2 text-lg",children:[e.jsx(re,{className:"w-5 h-5 text-primary"}),"Company Information"]})}),e.jsxs(u,{className:"space-y-4",children:[e.jsxs("div",{className:"grid gap-4 sm:grid-cols-2",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{htmlFor:"company_name",children:"Company Name *"}),e.jsx(r,{id:"company_name",...s.register("company_name"),placeholder:"Startup Inc."})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{htmlFor:"company_type",children:"Entity Type *"}),e.jsxs(v,{value:O,onValueChange:t=>a("company_type",t),children:[e.jsx(N,{id:"company_type",children:e.jsx(E,{})}),e.jsxs(F,{children:[e.jsx(l,{value:"llc",children:"LLC"}),e.jsx(l,{value:"c_corp",children:"C Corporation"}),e.jsx(l,{value:"s_corp",children:"S Corporation"}),e.jsx(l,{value:"partnership",children:"Partnership"})]})]})]})]}),e.jsxs("div",{className:"grid gap-4 sm:grid-cols-2",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{htmlFor:"state_of_incorporation",children:"State of Incorporation *"}),e.jsx(r,{id:"state_of_incorporation",...s.register("state_of_incorporation"),placeholder:"Delaware"})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{htmlFor:"effective_date",children:"Effective Date *"}),e.jsx(r,{id:"effective_date",type:"date",...s.register("effective_date")})]})]})]})]}),e.jsxs(g,{className:"doc-section-card",children:[e.jsxs(h,{children:[e.jsxs(x,{className:"flex items-center gap-2 text-lg",children:[e.jsx(ae,{className:"w-5 h-5 text-primary"}),"Founders & Equity"]}),e.jsxs(le,{children:["Total equity: ",e.jsxs("span",{className:j?"text-success font-semibold":"text-destructive font-semibold",children:[b,"%"]}),!j&&e.jsx("span",{className:"text-destructive ml-2",children:"(Must equal 100%)"})]})]}),e.jsxs(u,{className:"space-y-4",children:[A.map((t,n)=>e.jsxs("div",{className:"p-4 border rounded-lg bg-muted/30 space-y-4",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("h4",{className:"font-medium",children:["Founder ",n+1]}),A.length>1&&e.jsx(T,{type:"button",variant:"ghost",size:"sm",onClick:()=>L(n),className:"text-destructive hover:text-destructive",children:e.jsx(_e,{className:"w-4 h-4"})})]}),e.jsxs("div",{className:"grid gap-4 sm:grid-cols-2",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{children:"Full Name *"}),e.jsx(r,{...s.register(`founders.${n}.name`),placeholder:"John Smith"})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{children:"Email *"}),e.jsx(r,{type:"email",...s.register(`founders.${n}.email`),placeholder:"john@startup.com"})]})]}),e.jsxs("div",{className:"grid gap-4 sm:grid-cols-4",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{children:"Role *"}),e.jsx(r,{...s.register(`founders.${n}.role`),placeholder:"CEO"})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{children:"Equity %"}),e.jsx(r,{type:"number",...s.register(`founders.${n}.equity_percent`,{valueAsNumber:!0}),min:0,max:100,step:.1})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{children:"Vesting (mo)"}),e.jsx(r,{type:"number",...s.register(`founders.${n}.vesting_months`,{valueAsNumber:!0}),min:0,max:60})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{children:"Cliff (mo)"}),e.jsx(r,{type:"number",...s.register(`founders.${n}.cliff_months`,{valueAsNumber:!0}),min:0,max:24})]})]})]},t.id)),e.jsxs(T,{type:"button",variant:"outline",onClick:()=>w({name:"",email:"",role:"",equity_percent:0,vesting_months:48,cliff_months:12}),className:"w-full gap-2",children:[e.jsx(fe,{className:"w-4 h-4"}),"Add Founder"]})]})]}),e.jsxs(g,{className:"doc-section-card",children:[e.jsx(h,{children:e.jsxs(x,{className:"flex items-center gap-2 text-lg",children:[e.jsx(ce,{className:"w-5 h-5 text-primary"}),"Vesting & Intellectual Property"]})}),e.jsxs(u,{className:"space-y-4",children:[e.jsxs("div",{className:"grid gap-4 sm:grid-cols-2 lg:grid-cols-4",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{children:"Standard Vesting (mo)"}),e.jsx(r,{type:"number",...s.register("standard_vesting_months",{valueAsNumber:!0}),min:12,max:60})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{children:"Standard Cliff (mo)"}),e.jsx(r,{type:"number",...s.register("standard_cliff_months",{valueAsNumber:!0}),min:0,max:24})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{children:"Non-Compete (mo)"}),e.jsx(r,{type:"number",...s.register("non_compete_months",{valueAsNumber:!0}),min:0,max:36})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{children:"Non-Solicit (mo)"}),e.jsx(r,{type:"number",...s.register("non_solicit_months",{valueAsNumber:!0}),min:0,max:36})]})]}),e.jsxs("div",{className:"flex flex-wrap gap-6 pt-4",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(c,{id:"acceleration_on_exit",checked:Y,onCheckedChange:t=>a("acceleration_on_exit",!!t)}),e.jsx(i,{htmlFor:"acceleration_on_exit",className:"cursor-pointer",children:"Acceleration on Exit"})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(c,{id:"acceleration_on_termination",checked:H,onCheckedChange:t=>a("acceleration_on_termination",!!t)}),e.jsx(i,{htmlFor:"acceleration_on_termination",className:"cursor-pointer",children:"Acceleration on Termination"})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(c,{id:"ip_assignment",checked:J,onCheckedChange:t=>a("ip_assignment",!!t)}),e.jsx(i,{htmlFor:"ip_assignment",className:"cursor-pointer",children:"IP Assignment Required"})]})]})]})]}),e.jsxs(g,{className:"doc-section-card",children:[e.jsx(h,{children:e.jsxs(x,{className:"flex items-center gap-2 text-lg",children:[e.jsx(ye,{className:"w-5 h-5 text-primary"}),"Governance & Exit Provisions"]})}),e.jsxs(u,{className:"space-y-4",children:[e.jsxs("div",{className:"grid gap-4 sm:grid-cols-2",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{children:"Voting Threshold %"}),e.jsx(r,{type:"number",...s.register("voting_threshold",{valueAsNumber:!0}),min:50,max:100})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{children:"Buyback Price Method"}),e.jsxs(v,{value:G,onValueChange:t=>a("buyback_price_method",t),children:[e.jsx(N,{children:e.jsx(E,{})}),e.jsxs(F,{children:[e.jsx(l,{value:"fair_market_value",children:"Fair Market Value"}),e.jsx(l,{value:"cost_basis",children:"Original Cost"}),e.jsx(l,{value:"formula",children:"Formula-Based"})]})]})]})]}),e.jsxs("div",{className:"flex flex-wrap gap-6",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(c,{id:"drag_along",checked:Q,onCheckedChange:t=>a("drag_along",!!t)}),e.jsx(i,{htmlFor:"drag_along",className:"cursor-pointer",children:"Drag-Along Rights"})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(c,{id:"tag_along",checked:W,onCheckedChange:t=>a("tag_along",!!t)}),e.jsx(i,{htmlFor:"tag_along",className:"cursor-pointer",children:"Tag-Along Rights"})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(c,{id:"right_of_first_refusal",checked:K,onCheckedChange:t=>a("right_of_first_refusal",!!t)}),e.jsx(i,{htmlFor:"right_of_first_refusal",className:"cursor-pointer",children:"Right of First Refusal"})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(c,{id:"major_decisions_require_unanimous",checked:X,onCheckedChange:t=>a("major_decisions_require_unanimous",!!t)}),e.jsx(i,{htmlFor:"major_decisions_require_unanimous",className:"cursor-pointer",children:"Unanimous Major Decisions"})]})]})]})]}),e.jsxs(g,{className:"doc-section-card",children:[e.jsx(h,{children:e.jsxs(x,{className:"flex items-center gap-2 text-lg",children:[e.jsx(de,{className:"w-5 h-5 text-warning"}),"Legal & Disputes"]})}),e.jsxs(u,{className:"space-y-4",children:[e.jsxs("div",{className:"grid gap-4 sm:grid-cols-2",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{children:"Governing Law State"}),e.jsx(r,{...s.register("governing_law_state"),placeholder:"Delaware"})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{children:"Dispute Resolution"}),e.jsxs(v,{value:U,onValueChange:t=>a("dispute_resolution",t),children:[e.jsx(N,{children:e.jsx(E,{})}),e.jsxs(F,{children:[e.jsx(l,{value:"arbitration",children:"Binding Arbitration"}),e.jsx(l,{value:"litigation",children:"Court Litigation"}),e.jsx(l,{value:"mediation_first",children:"Mediation First"})]})]})]})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{children:"Additional Terms"}),e.jsx(me,{...s.register("additional_terms"),placeholder:"Any additional provisions or special terms...",rows:4})]})]})]}),!j&&e.jsx("div",{className:"p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-center",children:e.jsxs("p",{className:"text-sm text-destructive font-medium",children:["Equity must total 100% before downloading (currently ",b,"%)"]})})]})}export{tt as FounderAgreementForm};
//# sourceMappingURL=FounderAgreementForm-C11-EgBG.js.map
