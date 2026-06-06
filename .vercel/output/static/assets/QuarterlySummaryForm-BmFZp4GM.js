import{r as h,j as e}from"./ui-vendor-Ci_jhfUT.js";import{e as J,s as P}from"./DocsStudio-Cr5akC9A.js";import{u as D,a as N,C as E,z as n}from"./forms-5vTbOgwK.js";import{t as H}from"./zod-DDx_hEyQ.js";import{u as L,A as V}from"./useDocFormDraft-Bud_LrlS.js";import{d as p,f as d,g as u,T as O,e as x,I as a,B as v,am as U,ak as G}from"./index-C7JpK5Nd.js";import{T as w}from"./textarea-CJbm1bUG.js";import{L as o}from"./label-DUkIsdlE.js";import{S as K,a as Y,b as W,c as X,d as g}from"./select-Bk9iz0XS.js";import{P as z}from"./plus-C_Wh3IXV.js";import{T as $}from"./trash-2-BotGUTT-.js";import"./supabase-vendor-BXGp3RFH.js";import"./query-vendor-ouN-jH5-.js";import"./alert-dialog-BKxEo4on.js";import"./search-C6zDNM-a.js";import"./copy-DiM9sxD_.js";import"./date-utils-BcDumrce.js";import"./tabs-DKrhxIhe.js";import"./scale-DXtEBmWV.js";import"./eye-off-iRplz8OT.js";import"./react-vendor-CtFdHvrH.js";import"./dialog-CtleFdjJ.js";import"./chevron-down-BeAFGtZg.js";import"./calendar-Bqj7sfJ9.js";import"./chevron-up-DucWRmDp.js";const Z=n.object({company_name:n.string().min(2,"Company name required"),quarter:n.string(),prepared_by:n.string().min(2,"Prepared by required"),overview:n.string().min(20,"Overview must be at least 20 characters"),key_highlights:n.array(n.string()).min(1,"At least one highlight required"),total_revenue:n.number().min(0),subscription_revenue:n.number().min(0),consulting_revenue:n.number().min(0),total_expenses:n.number().min(0),net_income:n.number(),total_customers:n.number().min(0),new_customers:n.number().min(0),retention_rate:n.number().min(0).max(100),total_employees:n.number().min(1),achievements:n.array(n.object({area:n.string(),achievement:n.string(),impact:n.string()})),next_quarter_revenue_target:n.number().min(0),next_quarter_customers_target:n.number().min(0)});function ze({template:y,onGenerate:k,onPreviewUpdate:b,isGenerating:S}){const A=h.useMemo(()=>{const r=y?.template_json?.prefilled_content;return{company_name:r?.header?.company_name||"",quarter:r?.header?.quarter||"Q1 2026",prepared_by:r?.header?.prepared_by||"",overview:r?.executive_summary?.overview||"",key_highlights:r?.executive_summary?.key_highlights||[""],total_revenue:r?.financial_performance?.revenue?.total||0,subscription_revenue:r?.financial_performance?.revenue?.breakdown?.subscription_revenue||0,consulting_revenue:r?.financial_performance?.revenue?.breakdown?.consulting_services||0,total_expenses:r?.financial_performance?.expenses?.total||0,net_income:r?.financial_performance?.profitability?.net_income||0,total_customers:r?.operational_metrics?.customers?.total_customers||0,new_customers:r?.operational_metrics?.customers?.new_customers||0,retention_rate:(r?.operational_metrics?.customers?.retention_rate||0)*100,total_employees:r?.operational_metrics?.team_metrics?.total_employees||1,achievements:r?.key_achievements||[{area:"",achievement:"",impact:""}],next_quarter_revenue_target:r?.outlook?.q1_2026_targets?.revenue_target||0,next_quarter_customers_target:r?.outlook?.q1_2026_targets?.new_customers||0}},[y]),s=D({resolver:H(Z),defaultValues:A});L({form:s,templateId:"quarterly-summary"});const{fields:_,append:C,remove:q}=N({control:s.control,name:"achievements"}),{fields:j,append:T,remove:M}=N({control:s.control,name:"key_highlights"}),i=s.watch(),m=h.useMemo(()=>{const t=(i.total_revenue||0)-(i.total_expenses||0),r=i.total_revenue?t/i.total_revenue*100:0;return{grossProfit:t,grossMargin:r,revenueGrowth:45}},[i.total_revenue,i.total_expenses]);h.useEffect(()=>{const t=J(i),r=t.key_highlights||[],f=t.achievements||[],B=new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}),c=l=>`$${(l||0).toLocaleString("en-US",{maximumFractionDigits:0})}`,R=l=>`${(l||0).toFixed(1)}%`,I=`
      <div style="font-family: 'DM Sans', 'Inter', sans-serif; max-width: 800px; margin: 0 auto; padding: 24px; color: #1f2937;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 3px solid #2563eb;">
          <p style="color: #dc2626; font-weight: 600; font-size: 12px; letter-spacing: 2px; margin: 0 0 8px 0;">CONFIDENTIAL</p>
          <h1 style="font-family: 'Sora', sans-serif; font-size: 28px; font-weight: 700; color: #1f2937; margin: 0 0 8px 0; letter-spacing: -0.02em;">QUARTERLY BUSINESS SUMMARY</h1>
          <p style="font-size: 18px; color: #2563eb; font-weight: 600; margin: 0;">${t.company_name||""}</p>
          <p style="color: #6b7280; margin: 8px 0 0 0;">${t.quarter||""} | Prepared by ${t.prepared_by||""}</p>
          <p style="color: #9ca3af; font-size: 12px; margin: 4px 0 0 0;">Report Date: ${B}</p>
        </div>

        <!-- Executive Summary -->
        <div style="margin-bottom: 32px;">
          <h2 style="font-family: 'Sora', sans-serif; font-size: 18px; color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-bottom: 16px;">Executive Summary</h2>
          <p style="line-height: 1.6; color: #374151;">${t.overview||""}</p>
          
          <div style="margin-top: 16px; background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; border-radius: 0 8px 8px 0;">
            <p style="font-weight: 600; color: #166534; margin: 0 0 12px 0;">Key Highlights</p>
            <ul style="margin: 0; padding-left: 20px;">
              ${r.map(l=>`<li style="color: #166534; margin: 4px 0;">${l}</li>`).join("")}
            </ul>
          </div>
        </div>

        <!-- Financial Performance -->
        <div style="margin-bottom: 32px;">
          <h2 style="font-family: 'Sora', sans-serif; font-size: 18px; color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-bottom: 16px;">Financial Performance</h2>
          
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px;">
            <div style="background: #eff6ff; padding: 16px; border-radius: 8px; text-align: center;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">Total Revenue</p>
              <p style="font-size: 24px; font-weight: 700; color: #2563eb; margin: 4px 0; font-family: 'JetBrains Mono', monospace;">${c(i.total_revenue)}</p>
              <p style="color: #22c55e; font-size: 12px; margin: 0;">↑ ${m.revenueGrowth}% YoY</p>
            </div>
            <div style="background: #fef3c7; padding: 16px; border-radius: 8px; text-align: center;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">Total Expenses</p>
              <p style="font-size: 24px; font-weight: 700; color: #f59e0b; margin: 4px 0; font-family: 'JetBrains Mono', monospace;">${c(i.total_expenses)}</p>
            </div>
            <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; text-align: center;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">Net Income</p>
              <p style="font-size: 24px; font-weight: 700; color: #22c55e; margin: 4px 0; font-family: 'JetBrains Mono', monospace;">${c(i.net_income)}</p>
              <p style="color: #22c55e; font-size: 12px; margin: 0;">${R(m.grossMargin)} margin</p>
            </div>
          </div>

          <div style="background: #f9fafb; padding: 16px; border-radius: 8px;">
            <p style="font-weight: 600; margin: 0 0 12px 0;">Revenue Breakdown</p>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>Subscription Revenue:</span>
              <span style="font-weight: 600; font-family: 'JetBrains Mono', monospace;">${c(i.subscription_revenue)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Consulting Services:</span>
              <span style="font-weight: 600; font-family: 'JetBrains Mono', monospace;">${c(i.consulting_revenue)}</span>
            </div>
          </div>
        </div>

        <!-- Operational Metrics -->
        <div style="margin-bottom: 32px;">
          <h2 style="font-family: 'Sora', sans-serif; font-size: 18px; color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-bottom: 16px;">Operational Metrics</h2>
          
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
            <div style="background: #f3f4f6; padding: 12px; border-radius: 8px; text-align: center;">
              <p style="color: #6b7280; font-size: 11px; margin: 0;">Total Customers</p>
              <p style="font-size: 20px; font-weight: 700; color: #1f2937; margin: 4px 0; font-family: 'JetBrains Mono', monospace;">${i.total_customers?.toLocaleString()||0}</p>
            </div>
            <div style="background: #f3f4f6; padding: 12px; border-radius: 8px; text-align: center;">
              <p style="color: #6b7280; font-size: 11px; margin: 0;">New Customers</p>
              <p style="font-size: 20px; font-weight: 700; color: #22c55e; margin: 4px 0; font-family: 'JetBrains Mono', monospace;">+${i.new_customers||0}</p>
            </div>
            <div style="background: #f3f4f6; padding: 12px; border-radius: 8px; text-align: center;">
              <p style="color: #6b7280; font-size: 11px; margin: 0;">Retention Rate</p>
              <p style="font-size: 20px; font-weight: 700; color: #2563eb; margin: 4px 0; font-family: 'JetBrains Mono', monospace;">${i.retention_rate||0}%</p>
            </div>
            <div style="background: #f3f4f6; padding: 12px; border-radius: 8px; text-align: center;">
              <p style="color: #6b7280; font-size: 11px; margin: 0;">Team Size</p>
              <p style="font-size: 20px; font-weight: 700; color: #1f2937; margin: 4px 0; font-family: 'JetBrains Mono', monospace;">${i.total_employees||0}</p>
            </div>
          </div>
        </div>

        <!-- Key Achievements -->
        ${f.length>0?`
          <div style="margin-bottom: 32px;">
            <h2 style="font-size: 18px; color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-bottom: 16px;">Key Achievements</h2>
            ${f.map(l=>`
              <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid #2563eb;">
                <p style="font-weight: 600; color: #2563eb; margin: 0 0 4px 0;">${l.area}</p>
                <p style="margin: 0 0 8px 0;">${l.achievement}</p>
                <p style="color: #22c55e; font-size: 14px; margin: 0;">Impact: ${l.impact}</p>
              </div>
            `).join("")}
          </div>
        `:""}

        <!-- Outlook -->
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 24px; border-radius: 12px;">
          <h2 style="font-size: 18px; margin: 0 0 16px 0; color: white;">Next Quarter Targets</h2>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
            <div>
              <p style="opacity: 0.8; font-size: 12px; margin: 0;">Revenue Target</p>
              <p style="font-size: 28px; font-weight: 700; margin: 4px 0; font-family: 'JetBrains Mono', monospace;">${c(i.next_quarter_revenue_target)}</p>
            </div>
            <div>
              <p style="opacity: 0.8; font-size: 12px; margin: 0;">New Customers Target</p>
              <p style="font-size: 28px; font-weight: 700; margin: 4px 0; font-family: 'JetBrains Mono', monospace;">${i.next_quarter_customers_target}</p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 11px;">
          <p>CONFIDENTIAL - For Internal Use Only | ${t.company_name}</p>
          <p style="margin-top: 8px; font-size: 10px; color: #d1d5db;">Generated with <a href="https://aiwmcquantis.com" style="color: #3B82F6; text-decoration: none;">AIWMC Quantis</a></p>
        </div>
      </div>
    `;b(P(I))},[i,m,b]);const F=t=>{k({header:{company_name:t.company_name,quarter:t.quarter,prepared_by:t.prepared_by},executive_summary:{overview:t.overview,key_highlights:t.key_highlights},financial_performance:{revenue:{total:t.total_revenue,breakdown:{subscription_revenue:t.subscription_revenue,consulting_services:t.consulting_revenue}},expenses:{total:t.total_expenses},profitability:{net_income:t.net_income}},operational_metrics:{customers:{total_customers:t.total_customers,new_customers:t.new_customers,retention_rate:t.retention_rate/100},team_metrics:{total_employees:t.total_employees}},key_achievements:t.achievements,outlook:{revenue_target:t.next_quarter_revenue_target,customers_target:t.next_quarter_customers_target},calculated:m})},Q=h.useCallback(t=>{if(t.company_name&&s.setValue("company_name",t.company_name),t.quarterly_revenue&&s.setValue("total_revenue",t.quarterly_revenue),t.monthly_profit&&s.setValue("net_income",t.monthly_profit*3),t.gross_margin){const r=(t.quarterly_revenue||0)*(1-t.gross_margin/100);s.setValue("total_expenses",r)}},[s]);return e.jsxs("form",{onSubmit:s.handleSubmit(F),className:"space-y-6",children:[e.jsx("div",{className:"flex items-center justify-between mb-2",children:e.jsx(V,{onAutoFill:Q,disabled:S})}),e.jsxs(p,{children:[e.jsx(d,{children:e.jsxs(u,{className:"flex items-center gap-2",children:[e.jsx(O,{className:"w-5 h-5 text-primary"}),"Report Header"]})}),e.jsxs(x,{className:"space-y-4",children:[e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-4",children:[e.jsxs("div",{className:"md:col-span-2",children:[e.jsx(o,{children:"Company Name *"}),e.jsx(a,{...s.register("company_name"),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(o,{children:"Quarter *"}),e.jsx(E,{name:"quarter",control:s.control,render:({field:t})=>e.jsxs(K,{value:t.value,onValueChange:t.onChange,children:[e.jsx(Y,{className:"mt-1",children:e.jsx(W,{})}),e.jsxs(X,{children:[e.jsx(g,{value:"Q1 2025",children:"Q1 2025"}),e.jsx(g,{value:"Q2 2025",children:"Q2 2025"}),e.jsx(g,{value:"Q3 2025",children:"Q3 2025"}),e.jsx(g,{value:"Q4 2025",children:"Q4 2025"}),e.jsx(g,{value:"Q1 2026",children:"Q1 2026"}),e.jsx(g,{value:"Q2 2026",children:"Q2 2026"})]})]})})]})]}),e.jsxs("div",{children:[e.jsx(o,{children:"Prepared By *"}),e.jsx(a,{...s.register("prepared_by"),className:"mt-1"})]})]})]}),e.jsxs(p,{children:[e.jsx(d,{children:e.jsx(u,{children:"Executive Summary"})}),e.jsxs(x,{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsx(o,{children:"Overview *"}),e.jsx(w,{...s.register("overview"),rows:4,className:"mt-1"})]}),e.jsxs("div",{children:[e.jsxs("div",{className:"flex items-center justify-between mb-2",children:[e.jsx(o,{children:"Key Highlights"}),e.jsxs(v,{type:"button",variant:"outline",size:"sm",onClick:()=>T(""),children:[e.jsx(z,{className:"w-4 h-4 mr-1"})," Add"]})]}),j.map((t,r)=>e.jsxs("div",{className:"flex gap-2 mb-2",children:[e.jsx(a,{...s.register(`key_highlights.${r}`),placeholder:"Highlight point...",className:"flex-1"}),j.length>1&&e.jsx(v,{type:"button",variant:"ghost",size:"icon",onClick:()=>M(r),className:"text-destructive",children:e.jsx($,{className:"w-4 h-4"})})]},t.id))]})]})]}),e.jsxs(p,{children:[e.jsx(d,{children:e.jsxs(u,{className:"flex items-center gap-2",children:[e.jsx(U,{className:"w-5 h-5 text-primary"}),"Financial Performance"]})}),e.jsxs(x,{className:"space-y-4",children:[e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-4",children:[e.jsxs("div",{children:[e.jsx(o,{children:"Total Revenue ($) *"}),e.jsx(a,{type:"number",...s.register("total_revenue",{valueAsNumber:!0}),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(o,{children:"Subscription Revenue ($)"}),e.jsx(a,{type:"number",...s.register("subscription_revenue",{valueAsNumber:!0}),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(o,{children:"Consulting Revenue ($)"}),e.jsx(a,{type:"number",...s.register("consulting_revenue",{valueAsNumber:!0}),className:"mt-1"})]})]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsx(o,{children:"Total Expenses ($) *"}),e.jsx(a,{type:"number",...s.register("total_expenses",{valueAsNumber:!0}),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(o,{children:"Net Income ($) *"}),e.jsx(a,{type:"number",...s.register("net_income",{valueAsNumber:!0}),className:"mt-1"})]})]}),e.jsx("div",{className:"p-4 bg-primary/5 rounded-lg border border-primary/20",children:e.jsxs("div",{className:"grid grid-cols-2 gap-4 text-sm",children:[e.jsxs("div",{children:[e.jsx("span",{className:"text-muted-foreground",children:"Gross Profit:"}),e.jsxs("span",{className:"ml-2 font-semibold",children:["$",m.grossProfit.toLocaleString()]})]}),e.jsxs("div",{children:[e.jsx("span",{className:"text-muted-foreground",children:"Gross Margin:"}),e.jsxs("span",{className:"ml-2 font-semibold",children:[m.grossMargin.toFixed(1),"%"]})]})]})})]})]}),e.jsxs(p,{children:[e.jsx(d,{children:e.jsxs(u,{className:"flex items-center gap-2",children:[e.jsx(G,{className:"w-5 h-5 text-primary"}),"Operational Metrics"]})}),e.jsx(x,{children:e.jsxs("div",{className:"grid grid-cols-2 md:grid-cols-4 gap-4",children:[e.jsxs("div",{children:[e.jsx(o,{children:"Total Customers *"}),e.jsx(a,{type:"number",...s.register("total_customers",{valueAsNumber:!0}),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(o,{children:"New Customers *"}),e.jsx(a,{type:"number",...s.register("new_customers",{valueAsNumber:!0}),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(o,{children:"Retention Rate (%) *"}),e.jsx(a,{type:"number",step:"0.1",...s.register("retention_rate",{valueAsNumber:!0}),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(o,{children:"Team Size *"}),e.jsx(a,{type:"number",...s.register("total_employees",{valueAsNumber:!0}),className:"mt-1"})]})]})})]}),e.jsxs(p,{children:[e.jsx(d,{children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx(u,{children:"Key Achievements"}),e.jsxs(v,{type:"button",variant:"outline",size:"sm",onClick:()=>C({area:"",achievement:"",impact:""}),children:[e.jsx(z,{className:"w-4 h-4 mr-2"}),"Add Achievement"]})]})}),e.jsx(x,{className:"space-y-4",children:_.map((t,r)=>e.jsxs("div",{className:"p-4 border border-border rounded-lg space-y-3 bg-muted/30",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs(o,{className:"font-medium",children:["Achievement ",r+1]}),_.length>1&&e.jsx(v,{type:"button",variant:"ghost",size:"sm",onClick:()=>q(r),className:"text-destructive",children:e.jsx($,{className:"w-4 h-4"})})]}),e.jsx(a,{...s.register(`achievements.${r}.area`),placeholder:"Area (e.g., Product Development)"}),e.jsx(w,{...s.register(`achievements.${r}.achievement`),placeholder:"What was achieved...",rows:2}),e.jsx(a,{...s.register(`achievements.${r}.impact`),placeholder:"Business impact..."})]},t.id))})]}),e.jsxs(p,{children:[e.jsx(d,{children:e.jsx(u,{children:"Next Quarter Targets"})}),e.jsx(x,{children:e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsx(o,{children:"Revenue Target ($) *"}),e.jsx(a,{type:"number",...s.register("next_quarter_revenue_target",{valueAsNumber:!0}),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(o,{children:"New Customers Target *"}),e.jsx(a,{type:"number",...s.register("next_quarter_customers_target",{valueAsNumber:!0}),className:"mt-1"})]})]})})]})]})}export{ze as QuarterlySummaryForm};
//# sourceMappingURL=QuarterlySummaryForm-BmFZp4GM.js.map
