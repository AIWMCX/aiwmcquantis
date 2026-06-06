import{r as y,j as e}from"./ui-vendor-Ci_jhfUT.js";import{e as P,s as D}from"./DocsStudio-Cr5akC9A.js";import{u as V,z as r}from"./forms-5vTbOgwK.js";import{t as R}from"./zod-DDx_hEyQ.js";import{u as E,A as Y}from"./useDocFormDraft-Bud_LrlS.js";import{A as _}from"./AISuggestionButton-BhvECRL_.js";import{D as K}from"./DocDraftBanner-WLCzG5c7.js";import{d as l,f as m,g as d,F as I,ai as c,e as p,I as n,an as U,T as b,am as v,ak as O,w as H}from"./index-C7JpK5Nd.js";import{T as o}from"./textarea-CJbm1bUG.js";import{L as i}from"./label-DUkIsdlE.js";import{S as J,a as L,b as Q,c as G,d as x}from"./select-Bk9iz0XS.js";import"./supabase-vendor-BXGp3RFH.js";import"./query-vendor-ouN-jH5-.js";import"./alert-dialog-BKxEo4on.js";import"./plus-C_Wh3IXV.js";import"./search-C6zDNM-a.js";import"./copy-DiM9sxD_.js";import"./trash-2-BotGUTT-.js";import"./date-utils-BcDumrce.js";import"./tabs-DKrhxIhe.js";import"./scale-DXtEBmWV.js";import"./eye-off-iRplz8OT.js";import"./react-vendor-CtFdHvrH.js";import"./dialog-CtleFdjJ.js";import"./chevron-down-BeAFGtZg.js";import"./calendar-Bqj7sfJ9.js";import"./rotate-ccw-Y5oj2zEL.js";import"./chevron-up-DucWRmDp.js";const W=r.object({company_name:r.string().min(2,"Company name required"),tagline:r.string().min(5,"Tagline required"),executive_summary:r.string().min(100,"Executive summary must be at least 100 characters"),problem_statement:r.string().min(50,"Problem statement must be at least 50 characters"),solution_description:r.string().min(50,"Solution description must be at least 50 characters"),unique_value_proposition:r.string().min(20,"Value proposition required"),target_market:r.string().min(20,"Target market description required"),market_size_tam:r.number().min(0,"TAM required"),market_size_sam:r.number().min(0,"SAM required"),market_size_som:r.number().min(0,"SOM required"),competitive_advantage:r.string().min(30,"Competitive advantage required"),revenue_model:r.string().min(20,"Revenue model required"),pricing_strategy:r.string().min(10,"Pricing strategy required"),sales_channels:r.string().min(10,"Sales channels required"),year1_revenue:r.number().min(0),year2_revenue:r.number().min(0),year3_revenue:r.number().min(0),startup_costs:r.number().min(0),monthly_burn_rate:r.number().min(0),break_even_months:r.number().min(0).max(120),founders:r.string().min(10,"Founders information required"),team_size:r.number().min(1),key_hires_needed:r.string().optional(),key_risks:r.string().min(20,"Key risks required"),milestones:r.string().min(20,"Milestones required"),funding_stage:r.string(),funding_amount:r.number().min(0),use_of_funds:r.string().min(20,"Use of funds required")});function we({template:j,onGenerate:N,onPreviewUpdate:f,isGenerating:k}){const S=y.useMemo(()=>({company_name:"",tagline:"",executive_summary:"",problem_statement:"",solution_description:"",unique_value_proposition:"",target_market:"",market_size_tam:0,market_size_sam:0,market_size_som:0,competitive_advantage:"",revenue_model:"",pricing_strategy:"",sales_channels:"",year1_revenue:0,year2_revenue:0,year3_revenue:0,startup_costs:0,monthly_burn_rate:0,break_even_months:0,founders:"",team_size:1,key_hires_needed:"",key_risks:"",milestones:"",funding_stage:"seed",funding_amount:0,use_of_funds:""}),[j]),s=V({resolver:R(W),defaultValues:S}),{hasDraft:w,draftAge:z,isSaving:F,lastSaved:M,restoreDraft:$,dismissDraft:A,clearDraft:T}=E({form:s,templateId:"business-plan"}),a=s.watch();y.useEffect(()=>{const t=P(a),u=h=>`$${h.toLocaleString("en-US")}`,g=h=>`$${(h/1e9).toFixed(1)}B`,B=`
      <div style="font-family: 'DM Sans', 'Inter', sans-serif; max-width: 800px; margin: 0 auto; padding: 32px; color: #1f2937;">
        <!-- Cover -->
        <div style="text-align: center; padding: 48px 0; border-bottom: 3px solid #2563eb; margin-bottom: 32px;">
          <h1 style="font-family: 'Sora', sans-serif; font-size: 36px; font-weight: 700; margin: 0; color: #2563eb; letter-spacing: -0.02em;">${t.company_name||"Company Name"}</h1>
          <p style="font-size: 18px; color: #6b7280; margin: 16px 0 0 0; font-style: italic;">${t.tagline||"Tagline"}</p>
          <p style="font-size: 14px; color: #9ca3af; margin-top: 24px;">Business Plan ${new Date().getFullYear()}</p>
        </div>

        <!-- Executive Summary -->
        <section style="margin-bottom: 32px;">
          <h2 style="font-family: 'Sora', sans-serif; font-size: 20px; font-weight: 600; color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 16px; letter-spacing: -0.01em;">
            Executive Summary
          </h2>
          <p style="line-height: 1.8; text-align: justify;">${t.executive_summary||""}</p>
        </section>

        <!-- Problem & Solution -->
        <section style="margin-bottom: 32px;">
          <h2 style="font-family: 'Sora', sans-serif; font-size: 20px; font-weight: 600; color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 16px; letter-spacing: -0.01em;">
            Problem & Solution
          </h2>
          <div style="display: grid; gap: 16px;">
            <div style="padding: 16px; background: #fef2f2; border-left: 4px solid #dc2626; border-radius: 0 8px 8px 0;">
              <h3 style="font-size: 14px; font-weight: 600; color: #dc2626; margin: 0 0 8px 0;">The Problem</h3>
              <p style="margin: 0; line-height: 1.6;">${t.problem_statement||""}</p>
            </div>
            <div style="padding: 16px; background: #ecfdf5; border-left: 4px solid #10b981; border-radius: 0 8px 8px 0;">
              <h3 style="font-size: 14px; font-weight: 600; color: #10b981; margin: 0 0 8px 0;">Our Solution</h3>
              <p style="margin: 0; line-height: 1.6;">${t.solution_description||""}</p>
            </div>
          </div>
          <div style="margin-top: 16px; padding: 12px; background: #2563eb; color: white; border-radius: 8px; text-align: center;">
            <strong>Value Proposition:</strong> ${t.unique_value_proposition||""}
          </div>
        </section>

        <!-- Market Analysis -->
        <section style="margin-bottom: 32px;">
          <h2 style="font-family: 'Sora', sans-serif; font-size: 20px; font-weight: 600; color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 16px; letter-spacing: -0.01em;">
            Market Analysis
          </h2>
          <p style="margin-bottom: 16px; line-height: 1.6;"><strong>Target Market:</strong> ${t.target_market||""}</p>
          
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px;">
            <div style="padding: 16px; background: #f0f9ff; border-radius: 8px; text-align: center;">
              <p style="font-size: 12px; color: #6b7280; margin: 0;">TAM</p>
              <p style="font-size: 24px; font-weight: 700; color: #2563eb; margin: 4px 0; font-family: 'JetBrains Mono', monospace;">${g(a.market_size_tam||0)}</p>
            </div>
            <div style="padding: 16px; background: #f0f9ff; border-radius: 8px; text-align: center;">
              <p style="font-size: 12px; color: #6b7280; margin: 0;">SAM</p>
              <p style="font-size: 24px; font-weight: 700; color: #2563eb; margin: 4px 0; font-family: 'JetBrains Mono', monospace;">${g(a.market_size_sam||0)}</p>
            </div>
            <div style="padding: 16px; background: #f0f9ff; border-radius: 8px; text-align: center;">
              <p style="font-size: 12px; color: #6b7280; margin: 0;">SOM</p>
              <p style="font-size: 24px; font-weight: 700; color: #2563eb; margin: 4px 0; font-family: 'JetBrains Mono', monospace;">${g(a.market_size_som||0)}</p>
            </div>
          </div>
          
          <p style="line-height: 1.6;"><strong>Competitive Advantage:</strong> ${t.competitive_advantage||""}</p>
        </section>

        <!-- Business Model -->
        <section style="margin-bottom: 32px;">
          <h2 style="font-family: 'Sora', sans-serif; font-size: 20px; font-weight: 600; color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 16px; letter-spacing: -0.01em;">
            Business Model
          </h2>
          <div style="display: grid; gap: 12px;">
            <div style="padding: 12px; background: #f9fafb; border-radius: 8px;">
              <strong>Revenue Model:</strong> ${t.revenue_model||""}
            </div>
            <div style="padding: 12px; background: #f9fafb; border-radius: 8px;">
              <strong>Pricing Strategy:</strong> ${t.pricing_strategy||""}
            </div>
            <div style="padding: 12px; background: #f9fafb; border-radius: 8px;">
              <strong>Sales Channels:</strong> ${t.sales_channels||""}
            </div>
          </div>
        </section>

        <!-- Financial Projections -->
        <section style="margin-bottom: 32px;">
          <h2 style="font-family: 'Sora', sans-serif; font-size: 20px; font-weight: 600; color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 16px; letter-spacing: -0.01em;">
            Financial Projections
          </h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <thead>
              <tr style="background: #2563eb; color: white;">
                <th style="padding: 12px; text-align: left;">Metric</th>
                <th style="padding: 12px; text-align: right;">Year 1</th>
                <th style="padding: 12px; text-align: right;">Year 2</th>
                <th style="padding: 12px; text-align: right;">Year 3</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px;">Revenue</td>
                <td style="padding: 12px; text-align: right; font-weight: 600; font-family: 'JetBrains Mono', monospace;">${u(a.year1_revenue||0)}</td>
                <td style="padding: 12px; text-align: right; font-weight: 600; font-family: 'JetBrains Mono', monospace;">${u(a.year2_revenue||0)}</td>
                <td style="padding: 12px; text-align: right; font-weight: 600; font-family: 'JetBrains Mono', monospace;">${u(a.year3_revenue||0)}</td>
              </tr>
            </tbody>
          </table>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
            <div style="padding: 12px; background: #fef3c7; border-radius: 8px; text-align: center;">
              <p style="font-size: 12px; color: #92400e; margin: 0;">Startup Costs</p>
              <p style="font-size: 18px; font-weight: 700; margin: 4px 0;">${u(a.startup_costs||0)}</p>
            </div>
            <div style="padding: 12px; background: #fef3c7; border-radius: 8px; text-align: center;">
              <p style="font-size: 12px; color: #92400e; margin: 0;">Monthly Burn</p>
              <p style="font-size: 18px; font-weight: 700; margin: 4px 0;">${u(a.monthly_burn_rate||0)}</p>
            </div>
            <div style="padding: 12px; background: #ecfdf5; border-radius: 8px; text-align: center;">
              <p style="font-size: 12px; color: #065f46; margin: 0;">Break-even</p>
              <p style="font-size: 18px; font-weight: 700; margin: 4px 0;">${a.break_even_months||0} months</p>
            </div>
          </div>
        </section>

        <!-- Team -->
        <section style="margin-bottom: 32px;">
          <h2 style="font-size: 20px; font-weight: 600; color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 16px;">
            Team
          </h2>
          <p style="line-height: 1.6;"><strong>Founders:</strong> ${t.founders||""}</p>
          <p style="line-height: 1.6;"><strong>Current Team Size:</strong> ${t.team_size} employees</p>
          ${t.key_hires_needed?`<p style="line-height: 1.6;"><strong>Key Hires Needed:</strong> ${t.key_hires_needed}</p>`:""}
        </section>

        <!-- Risks & Milestones -->
        <section style="margin-bottom: 32px;">
          <h2 style="font-size: 20px; font-weight: 600; color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 16px;">
            Risks & Milestones
          </h2>
          <div style="display: grid; gap: 16px;">
            <div style="padding: 16px; background: #fef2f2; border-radius: 8px;">
              <h3 style="font-size: 14px; font-weight: 600; color: #dc2626; margin: 0 0 8px 0;">Key Risks</h3>
              <p style="margin: 0; white-space: pre-line;">${t.key_risks||""}</p>
            </div>
            <div style="padding: 16px; background: #ecfdf5; border-radius: 8px;">
              <h3 style="font-size: 14px; font-weight: 600; color: #10b981; margin: 0 0 8px 0;">Key Milestones</h3>
              <p style="margin: 0; white-space: pre-line;">${t.milestones||""}</p>
            </div>
          </div>
        </section>

        <!-- Funding -->
        <section style="margin-bottom: 32px;">
          <h2 style="font-size: 20px; font-weight: 600; color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 16px;">
            Funding Request
          </h2>
          <div style="padding: 24px; background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: white; border-radius: 12px; text-align: center;">
            <p style="font-size: 14px; margin: 0 0 8px 0; opacity: 0.9;">Seeking ${t.funding_stage?.toUpperCase()||"SEED"} Round</p>
            <p style="font-size: 36px; font-weight: 700; margin: 0;">${u(a.funding_amount||0)}</p>
          </div>
          <div style="margin-top: 16px; padding: 16px; background: #f9fafb; border-radius: 8px;">
            <strong>Use of Funds:</strong> ${t.use_of_funds||""}
          </div>
        </section>

        <!-- Footer -->
        <div style="margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>Confidential Business Plan - ${t.company_name||"Company"} © ${new Date().getFullYear()}</p>
          <p style="margin-top: 8px; font-size: 10px; color: #d1d5db;">Generated with <a href="https://aiwmcquantis.com" style="color: #3B82F6; text-decoration: none;">AIWMC Quantis</a></p>
        </div>
      </div>
    `;f(D(B))},[a,f]);const q=t=>{T(),N(t)},C=y.useCallback(t=>{t.company_name&&s.setValue("company_name",t.company_name),t.monthly_revenue&&(s.setValue("year1_revenue",t.monthly_revenue*12),s.setValue("year2_revenue",t.monthly_revenue*12*2.5),s.setValue("year3_revenue",t.monthly_revenue*12*5)),t.startup_investment&&s.setValue("startup_costs",t.startup_investment),t.payback_months&&s.setValue("break_even_months",t.payback_months)},[s]);return e.jsxs("form",{onSubmit:s.handleSubmit(q),className:"space-y-6","aria-label":"Business Plan Generator Form",children:[e.jsx(K,{hasDraft:w,draftAge:z,isSaving:F,lastSaved:M,onRestore:$,onDismiss:A}),e.jsx("div",{className:"flex items-center justify-between",children:e.jsx(Y,{onAutoFill:C,disabled:k})}),e.jsxs(l,{children:[e.jsxs(m,{children:[e.jsxs(d,{className:"flex items-center gap-2",children:[e.jsx(I,{className:"w-5 h-5 text-primary","aria-hidden":"true"}),"Executive Summary"]}),e.jsx(c,{children:"Provide a compelling overview of your business"})]}),e.jsxs(p,{className:"space-y-4",children:[e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsxs(i,{htmlFor:"company_name",children:["Company Name ",e.jsx("span",{className:"text-destructive","aria-label":"required",children:"*"})]}),e.jsx(n,{id:"company_name",...s.register("company_name"),className:"mt-1","aria-describedby":s.formState.errors.company_name?"company_name-error":void 0,"aria-invalid":!!s.formState.errors.company_name}),s.formState.errors.company_name&&e.jsx("p",{id:"company_name-error",className:"text-sm text-destructive mt-1",role:"alert",children:s.formState.errors.company_name.message})]}),e.jsxs("div",{children:[e.jsxs(i,{htmlFor:"tagline",children:["Tagline ",e.jsx("span",{className:"text-destructive","aria-label":"required",children:"*"})]}),e.jsx(n,{id:"tagline",...s.register("tagline"),className:"mt-1"})]})]}),e.jsxs("div",{children:[e.jsxs("div",{className:"flex items-center justify-between mb-1",children:[e.jsxs(i,{htmlFor:"executive_summary",children:["Executive Summary ",e.jsx("span",{className:"text-destructive","aria-label":"required",children:"*"})]}),e.jsx(_,{sectionType:"executive_summary",context:{business_name:a.company_name,industry:"Technology"},onApply:t=>s.setValue("executive_summary",t)})]}),e.jsx(o,{id:"executive_summary",...s.register("executive_summary"),rows:5,className:"mt-1","aria-describedby":"executive_summary-hint"}),e.jsx("p",{id:"executive_summary-hint",className:"text-xs text-muted-foreground mt-1",children:"Minimum 100 characters. Summarize your business opportunity concisely."})]})]})]}),e.jsxs(l,{children:[e.jsxs(m,{children:[e.jsxs(d,{className:"flex items-center gap-2",children:[e.jsx(U,{className:"w-5 h-5 text-primary","aria-hidden":"true"}),"Problem & Solution"]}),e.jsx(c,{children:"What problem do you solve and how?"})]}),e.jsxs(p,{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsxs("div",{className:"flex items-center justify-between mb-1",children:[e.jsxs(i,{htmlFor:"problem_statement",children:["Problem Statement ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(_,{sectionType:"market_analysis",context:{business_name:a.company_name},onApply:t=>s.setValue("problem_statement",t)})]}),e.jsx(o,{id:"problem_statement",...s.register("problem_statement"),rows:3,className:"mt-1"})]}),e.jsxs("div",{children:[e.jsxs(i,{htmlFor:"solution_description",children:["Your Solution ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(o,{id:"solution_description",...s.register("solution_description"),rows:3,className:"mt-1"})]}),e.jsxs("div",{children:[e.jsxs(i,{htmlFor:"unique_value_proposition",children:["Unique Value Proposition ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(n,{id:"unique_value_proposition",...s.register("unique_value_proposition"),className:"mt-1",placeholder:"One sentence that captures your unique value"})]})]})]}),e.jsxs(l,{children:[e.jsxs(m,{children:[e.jsxs(d,{className:"flex items-center gap-2",children:[e.jsx(b,{className:"w-5 h-5 text-primary","aria-hidden":"true"}),"Market Analysis"]}),e.jsx(c,{children:"Define your market size and opportunity"})]}),e.jsxs(p,{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsxs(i,{htmlFor:"target_market",children:["Target Market Description ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(o,{id:"target_market",...s.register("target_market"),rows:2,className:"mt-1"})]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-4",children:[e.jsxs("div",{children:[e.jsxs(i,{htmlFor:"market_size_tam",children:["TAM (Total Addressable Market) ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(n,{id:"market_size_tam",type:"number",...s.register("market_size_tam",{valueAsNumber:!0}),className:"mt-1",placeholder:"$150,000,000,000"}),e.jsx("p",{className:"text-xs text-muted-foreground mt-1",children:"In USD"})]}),e.jsxs("div",{children:[e.jsxs(i,{htmlFor:"market_size_sam",children:["SAM (Serviceable Market) ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(n,{id:"market_size_sam",type:"number",...s.register("market_size_sam",{valueAsNumber:!0}),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsxs(i,{htmlFor:"market_size_som",children:["SOM (Obtainable Market) ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(n,{id:"market_size_som",type:"number",...s.register("market_size_som",{valueAsNumber:!0}),className:"mt-1"})]})]}),e.jsxs("div",{children:[e.jsxs(i,{htmlFor:"competitive_advantage",children:["Competitive Advantage ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(o,{id:"competitive_advantage",...s.register("competitive_advantage"),rows:2,className:"mt-1"})]})]})]}),e.jsxs(l,{children:[e.jsxs(m,{children:[e.jsxs(d,{className:"flex items-center gap-2",children:[e.jsx(v,{className:"w-5 h-5 text-primary","aria-hidden":"true"}),"Business Model"]}),e.jsx(c,{children:"How will you make money?"})]}),e.jsxs(p,{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsxs(i,{htmlFor:"revenue_model",children:["Revenue Model ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(o,{id:"revenue_model",...s.register("revenue_model"),rows:2,className:"mt-1",placeholder:"Describe your revenue streams"})]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsxs(i,{htmlFor:"pricing_strategy",children:["Pricing Strategy ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(n,{id:"pricing_strategy",...s.register("pricing_strategy"),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsxs(i,{htmlFor:"sales_channels",children:["Sales Channels ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(n,{id:"sales_channels",...s.register("sales_channels"),className:"mt-1"})]})]})]})]}),e.jsxs(l,{children:[e.jsxs(m,{children:[e.jsxs(d,{className:"flex items-center gap-2",children:[e.jsx(b,{className:"w-5 h-5 text-primary","aria-hidden":"true"}),"Financial Projections"]}),e.jsx(c,{children:"3-year revenue projections and key metrics"})]}),e.jsxs(p,{className:"space-y-4",children:[e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-4",children:[e.jsxs("div",{children:[e.jsx(i,{htmlFor:"year1_revenue",children:"Year 1 Revenue ($)"}),e.jsx(n,{id:"year1_revenue",type:"number",...s.register("year1_revenue",{valueAsNumber:!0}),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(i,{htmlFor:"year2_revenue",children:"Year 2 Revenue ($)"}),e.jsx(n,{id:"year2_revenue",type:"number",...s.register("year2_revenue",{valueAsNumber:!0}),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(i,{htmlFor:"year3_revenue",children:"Year 3 Revenue ($)"}),e.jsx(n,{id:"year3_revenue",type:"number",...s.register("year3_revenue",{valueAsNumber:!0}),className:"mt-1"})]})]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-4",children:[e.jsxs("div",{children:[e.jsx(i,{htmlFor:"startup_costs",children:"Startup Costs ($)"}),e.jsx(n,{id:"startup_costs",type:"number",...s.register("startup_costs",{valueAsNumber:!0}),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(i,{htmlFor:"monthly_burn_rate",children:"Monthly Burn Rate ($)"}),e.jsx(n,{id:"monthly_burn_rate",type:"number",...s.register("monthly_burn_rate",{valueAsNumber:!0}),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(i,{htmlFor:"break_even_months",children:"Break-even (months)"}),e.jsx(n,{id:"break_even_months",type:"number",min:0,max:120,...s.register("break_even_months",{valueAsNumber:!0}),className:"mt-1"})]})]})]})]}),e.jsxs(l,{children:[e.jsxs(m,{children:[e.jsxs(d,{className:"flex items-center gap-2",children:[e.jsx(O,{className:"w-5 h-5 text-primary","aria-hidden":"true"}),"Team"]}),e.jsx(c,{children:"Your founding team and hiring plans"})]}),e.jsxs(p,{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsxs(i,{htmlFor:"founders",children:["Founders & Key Experience ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(o,{id:"founders",...s.register("founders"),rows:2,className:"mt-1"})]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsx(i,{htmlFor:"team_size",children:"Current Team Size"}),e.jsx(n,{id:"team_size",type:"number",min:1,...s.register("team_size",{valueAsNumber:!0}),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(i,{htmlFor:"key_hires_needed",children:"Key Hires Needed"}),e.jsx(n,{id:"key_hires_needed",...s.register("key_hires_needed"),className:"mt-1",placeholder:"VP Sales, Engineers, etc."})]})]})]})]}),e.jsxs(l,{children:[e.jsxs(m,{children:[e.jsxs(d,{className:"flex items-center gap-2",children:[e.jsx(H,{className:"w-5 h-5 text-primary","aria-hidden":"true"}),"Risks & Milestones"]}),e.jsx(c,{children:"Key risks and upcoming milestones"})]}),e.jsxs(p,{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsxs("div",{className:"flex items-center justify-between mb-1",children:[e.jsxs(i,{htmlFor:"key_risks",children:["Key Risks ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(_,{sectionType:"risk_assessment",context:{business_name:a.company_name},onApply:t=>s.setValue("key_risks",t)})]}),e.jsx(o,{id:"key_risks",...s.register("key_risks"),rows:3,className:"mt-1"})]}),e.jsxs("div",{children:[e.jsxs(i,{htmlFor:"milestones",children:["Key Milestones ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(o,{id:"milestones",...s.register("milestones"),rows:3,className:"mt-1",placeholder:`Q1: Launch product
Q2: 100 customers
Q3: Profitability`})]})]})]}),e.jsxs(l,{children:[e.jsxs(m,{children:[e.jsxs(d,{className:"flex items-center gap-2",children:[e.jsx(v,{className:"w-5 h-5 text-primary","aria-hidden":"true"}),"Funding Request"]}),e.jsx(c,{children:"Your funding needs and use of capital"})]}),e.jsxs(p,{className:"space-y-4",children:[e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsx(i,{htmlFor:"funding_stage",children:"Funding Stage"}),e.jsxs(J,{value:a.funding_stage,onValueChange:t=>s.setValue("funding_stage",t),children:[e.jsx(L,{id:"funding_stage",className:"mt-1",children:e.jsx(Q,{placeholder:"Select stage"})}),e.jsxs(G,{children:[e.jsx(x,{value:"pre-seed",children:"Pre-Seed"}),e.jsx(x,{value:"seed",children:"Seed"}),e.jsx(x,{value:"series-a",children:"Series A"}),e.jsx(x,{value:"series-b",children:"Series B"}),e.jsx(x,{value:"growth",children:"Growth"})]})]})]}),e.jsxs("div",{children:[e.jsx(i,{htmlFor:"funding_amount",children:"Funding Amount ($)"}),e.jsx(n,{id:"funding_amount",type:"number",...s.register("funding_amount",{valueAsNumber:!0}),className:"mt-1"})]})]}),e.jsxs("div",{children:[e.jsxs(i,{htmlFor:"use_of_funds",children:["Use of Funds ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(o,{id:"use_of_funds",...s.register("use_of_funds"),rows:2,className:"mt-1",placeholder:"Product (40%), Sales (35%), Operations (15%), Reserve (10%)"})]})]})]})]})}export{we as BusinessPlanForm};
//# sourceMappingURL=BusinessPlanForm-B74NkIse.js.map
