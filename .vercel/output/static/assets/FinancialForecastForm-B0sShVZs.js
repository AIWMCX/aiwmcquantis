import{r as g,j as e}from"./ui-vendor-Ci_jhfUT.js";import{e as B,s as P}from"./DocsStudio-Cr5akC9A.js";import{u as V,z as s}from"./forms-5vTbOgwK.js";import{t as T}from"./zod-DDx_hEyQ.js";import{u as J,A as G}from"./useDocFormDraft-Bud_LrlS.js";import{D as L}from"./DocDraftBanner-WLCzG5c7.js";import{aY as Y,d as l,f as d,g as p,T as h,e as m,I as a,ai as b,am as I}from"./index-C7JpK5Nd.js";import{L as i}from"./label-DUkIsdlE.js";import{A as q,b as H}from"./alert-D2Y_GnKU.js";import{C as U}from"./chart-pie-DMbixSaY.js";import"./supabase-vendor-BXGp3RFH.js";import"./query-vendor-ouN-jH5-.js";import"./alert-dialog-BKxEo4on.js";import"./select-Bk9iz0XS.js";import"./chevron-down-BeAFGtZg.js";import"./chevron-up-DucWRmDp.js";import"./plus-C_Wh3IXV.js";import"./search-C6zDNM-a.js";import"./copy-DiM9sxD_.js";import"./trash-2-BotGUTT-.js";import"./date-utils-BcDumrce.js";import"./tabs-DKrhxIhe.js";import"./scale-DXtEBmWV.js";import"./eye-off-iRplz8OT.js";import"./react-vendor-CtFdHvrH.js";import"./dialog-CtleFdjJ.js";import"./calendar-Bqj7sfJ9.js";import"./rotate-ccw-Y5oj2zEL.js";const E=s.object({company_name:s.string().min(2,"Company name required"),forecast_period:s.string().min(2,"Period required"),currency:s.string().min(1,"Currency required"),current_mrr:s.number().min(0),current_customers:s.number().min(0),current_arpu:s.number().min(0),current_churn_rate:s.number().min(0).max(100),pess_growth_rate:s.number(),pess_churn_rate:s.number().min(0).max(100),pess_cac:s.number().min(0),base_growth_rate:s.number(),base_churn_rate:s.number().min(0).max(100),base_cac:s.number().min(0),opt_growth_rate:s.number(),opt_churn_rate:s.number().min(0).max(100),opt_cac:s.number().min(0),fixed_costs_monthly:s.number().min(0),variable_cost_percent:s.number().min(0).max(100),sales_marketing_percent:s.number().min(0).max(100),ltv_target:s.number().min(0),payback_months_target:s.number().min(0),gross_margin_target:s.number().min(0).max(100)});function ve({template:f,onGenerate:y,onPreviewUpdate:u,isGenerating:j}){const v=g.useMemo(()=>({company_name:"",forecast_period:"",currency:"USD",current_mrr:0,current_customers:0,current_arpu:0,current_churn_rate:0,pess_growth_rate:10,pess_churn_rate:5,pess_cac:0,base_growth_rate:25,base_churn_rate:3,base_cac:0,opt_growth_rate:40,opt_churn_rate:2,opt_cac:0,fixed_costs_monthly:0,variable_cost_percent:20,sales_marketing_percent:30,ltv_target:0,payback_months_target:12,gross_margin_target:70}),[f]),r=V({resolver:T(E),defaultValues:v}),{hasDraft:N,draftAge:w,isSaving:F,lastSaved:C,restoreDraft:$,dismissDraft:k,clearDraft:A}=J({form:r,templateId:"financial-forecast"}),o=r.watch(),c=g.useMemo(()=>{const t=(n,x)=>[1,12,24,36].map(M=>{const D=(n-x)/100,R=o.current_mrr*Math.pow(1+D/12,M);return Math.round(R)});return{pessimistic:t(o.pess_growth_rate,o.pess_churn_rate),base:t(o.base_growth_rate,o.base_churn_rate),optimistic:t(o.opt_growth_rate,o.opt_churn_rate)}},[o]);g.useEffect(()=>{const t=B(o),n=_=>`$${_.toLocaleString("en-US")}`,x=`
      <div style="font-family: 'DM Sans', 'Inter', sans-serif; max-width: 800px; margin: 0 auto; padding: 32px; color: #1f2937;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 3px solid #2563eb;">
          <h1 style="font-family: 'Sora', sans-serif; font-size: 28px; font-weight: 700; color: #2563eb; margin: 0; letter-spacing: -0.02em;">Financial Forecast</h1>
          <p style="font-size: 16px; color: #6b7280; margin: 8px 0 0 0;">${t.company_name||"Company"} • ${t.forecast_period||"Period"}</p>
        </div>

        <!-- Current State -->
        <section style="margin-bottom: 32px;">
          <h2 style="font-family: 'Sora', sans-serif; font-size: 18px; font-weight: 600; color: #374151; margin: 0 0 16px 0;">Current State</h2>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
            <div style="padding: 16px; background: #f0f9ff; border-radius: 8px; text-align: center;">
              <p style="font-size: 12px; color: #6b7280; margin: 0;">Monthly Revenue</p>
              <p style="font-size: 24px; font-weight: 700; color: #2563eb; margin: 4px 0; font-family: 'JetBrains Mono', monospace;">${n(o.current_mrr)}</p>
            </div>
            <div style="padding: 16px; background: #f0f9ff; border-radius: 8px; text-align: center;">
              <p style="font-size: 12px; color: #6b7280; margin: 0;">Customers</p>
              <p style="font-size: 24px; font-weight: 700; color: #2563eb; margin: 4px 0; font-family: 'JetBrains Mono', monospace;">${t.current_customers}</p>
            </div>
            <div style="padding: 16px; background: #f0f9ff; border-radius: 8px; text-align: center;">
              <p style="font-size: 12px; color: #6b7280; margin: 0;">ARPU</p>
              <p style="font-size: 24px; font-weight: 700; color: #2563eb; margin: 4px 0; font-family: 'JetBrains Mono', monospace;">${n(o.current_arpu)}</p>
            </div>
            <div style="padding: 16px; background: #f0f9ff; border-radius: 8px; text-align: center;">
              <p style="font-size: 12px; color: #6b7280; margin: 0;">Churn Rate</p>
              <p style="font-size: 24px; font-weight: 700; color: #2563eb; margin: 4px 0; font-family: 'JetBrains Mono', monospace;">${t.current_churn_rate}%</p>
            </div>
          </div>
        </section>

        <!-- 3-Scenario Projections -->
        <section style="margin-bottom: 32px;">
          <h2 style="font-family: 'Sora', sans-serif; font-size: 18px; font-weight: 600; color: #374151; margin: 0 0 16px 0;">Revenue Projections (3 Scenarios)</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #374151; color: white;">
                <th style="padding: 12px; text-align: left;">Scenario</th>
                <th style="padding: 12px; text-align: right;">Month 1</th>
                <th style="padding: 12px; text-align: right;">Year 1</th>
                <th style="padding: 12px; text-align: right;">Year 2</th>
                <th style="padding: 12px; text-align: right;">Year 3</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid #e5e7eb; background: #fef2f2;">
                <td style="padding: 12px; font-weight: 600; color: #dc2626;">Pessimistic</td>
                <td style="padding: 12px; text-align: right;">${n(c.pessimistic[0])}</td>
                <td style="padding: 12px; text-align: right;">${n(c.pessimistic[1])}</td>
                <td style="padding: 12px; text-align: right;">${n(c.pessimistic[2])}</td>
                <td style="padding: 12px; text-align: right; font-weight: 600;">${n(c.pessimistic[3])}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb; background: #f0f9ff;">
                <td style="padding: 12px; font-weight: 600; color: #2563eb;">Base Case</td>
                <td style="padding: 12px; text-align: right;">${n(c.base[0])}</td>
                <td style="padding: 12px; text-align: right;">${n(c.base[1])}</td>
                <td style="padding: 12px; text-align: right;">${n(c.base[2])}</td>
                <td style="padding: 12px; text-align: right; font-weight: 600;">${n(c.base[3])}</td>
              </tr>
              <tr style="background: #ecfdf5;">
                <td style="padding: 12px; font-weight: 600; color: #10b981;">Optimistic</td>
                <td style="padding: 12px; text-align: right;">${n(c.optimistic[0])}</td>
                <td style="padding: 12px; text-align: right;">${n(c.optimistic[1])}</td>
                <td style="padding: 12px; text-align: right;">${n(c.optimistic[2])}</td>
                <td style="padding: 12px; text-align: right; font-weight: 600;">${n(c.optimistic[3])}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- Assumptions -->
        <section style="margin-bottom: 32px;">
          <h2 style="font-family: 'Sora', sans-serif; font-size: 18px; font-weight: 600; color: #374151; margin: 0 0 16px 0;">Key Assumptions</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb;">Metric</th>
                <th style="padding: 10px; text-align: center; color: #dc2626; border-bottom: 1px solid #e5e7eb;">Pessimistic</th>
                <th style="padding: 10px; text-align: center; color: #2563eb; border-bottom: 1px solid #e5e7eb;">Base</th>
                <th style="padding: 10px; text-align: center; color: #10b981; border-bottom: 1px solid #e5e7eb;">Optimistic</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px;">Growth Rate</td>
                <td style="padding: 10px; text-align: center;">${t.pess_growth_rate}%</td>
                <td style="padding: 10px; text-align: center;">${t.base_growth_rate}%</td>
                <td style="padding: 10px; text-align: center;">${t.opt_growth_rate}%</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px;">Churn Rate</td>
                <td style="padding: 10px; text-align: center;">${t.pess_churn_rate}%</td>
                <td style="padding: 10px; text-align: center;">${t.base_churn_rate}%</td>
                <td style="padding: 10px; text-align: center;">${t.opt_churn_rate}%</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px;">CAC</td>
                <td style="padding: 10px; text-align: center;">${n(o.pess_cac)}</td>
                <td style="padding: 10px; text-align: center;">${n(o.base_cac)}</td>
                <td style="padding: 10px; text-align: center;">${n(o.opt_cac)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- Cost Structure -->
        <section style="margin-bottom: 32px;">
          <h2 style="font-family: 'Sora', sans-serif; font-size: 18px; font-weight: 600; color: #374151; margin: 0 0 16px 0;">Cost Structure</h2>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
            <div style="padding: 16px; background: #fef3c7; border-radius: 8px; text-align: center;">
              <p style="font-size: 12px; color: #92400e; margin: 0;">Fixed Costs (Monthly)</p>
              <p style="font-size: 20px; font-weight: 700; color: #92400e; margin: 4px 0; font-family: 'JetBrains Mono', monospace;">${n(o.fixed_costs_monthly)}</p>
            </div>
            <div style="padding: 16px; background: #fef3c7; border-radius: 8px; text-align: center;">
              <p style="font-size: 12px; color: #92400e; margin: 0;">Variable Costs</p>
              <p style="font-size: 20px; font-weight: 700; color: #92400e; margin: 4px 0; font-family: 'JetBrains Mono', monospace;">${t.variable_cost_percent}%</p>
            </div>
            <div style="padding: 16px; background: #fef3c7; border-radius: 8px; text-align: center;">
              <p style="font-size: 12px; color: #92400e; margin: 0;">Sales & Marketing</p>
              <p style="font-size: 20px; font-weight: 700; color: #92400e; margin: 4px 0; font-family: 'JetBrains Mono', monospace;">${t.sales_marketing_percent}%</p>
            </div>
          </div>
        </section>

        <!-- Target Metrics -->
        <section style="margin-bottom: 32px;">
          <h2 style="font-family: 'Sora', sans-serif; font-size: 18px; font-weight: 600; color: #374151; margin: 0 0 16px 0;">Target Metrics</h2>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
            <div style="padding: 16px; background: #ecfdf5; border-radius: 8px; text-align: center;">
              <p style="font-size: 12px; color: #065f46; margin: 0;">LTV Target</p>
              <p style="font-size: 20px; font-weight: 700; color: #10b981; margin: 4px 0; font-family: 'JetBrains Mono', monospace;">${n(o.ltv_target)}</p>
            </div>
            <div style="padding: 16px; background: #ecfdf5; border-radius: 8px; text-align: center;">
              <p style="font-size: 12px; color: #065f46; margin: 0;">Payback Period</p>
              <p style="font-size: 20px; font-weight: 700; color: #10b981; margin: 4px 0; font-family: 'JetBrains Mono', monospace;">${t.payback_months_target} mo</p>
            </div>
            <div style="padding: 16px; background: #ecfdf5; border-radius: 8px; text-align: center;">
              <p style="font-size: 12px; color: #065f46; margin: 0;">Gross Margin</p>
              <p style="font-size: 20px; font-weight: 700; color: #10b981; margin: 4px 0; font-family: 'JetBrains Mono', monospace;">${t.gross_margin_target}%</p>
            </div>
          </div>
        </section>

        <!-- Footer -->
        <div style="margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>Financial Forecast - ${t.company_name||"Company"} © ${new Date().getFullYear()}</p>
          <p style="margin-top: 8px; font-size: 10px;">Generated with <a href="https://aiwmcquantis.com" style="color: #3B82F6; text-decoration: none;">AIWMC Quantis</a></p>
        </div>
      </div>
    `;u(P(x))},[o,c,u]);const z=t=>{A(),y({...t,projections:c})},S=g.useCallback(t=>{t.company_name&&r.setValue("company_name",t.company_name),t.monthly_revenue&&r.setValue("current_mrr",t.monthly_revenue),t.cac&&(r.setValue("base_cac",t.cac),r.setValue("pess_cac",t.cac*1.5),r.setValue("opt_cac",t.cac*.7)),t.ltv&&r.setValue("ltv_target",t.ltv),t.payback_months&&r.setValue("payback_months_target",t.payback_months)},[r]);return e.jsxs("form",{onSubmit:r.handleSubmit(z),className:"space-y-6","aria-label":"Financial Forecast Form",children:[e.jsx(L,{hasDraft:N,draftAge:w,isSaving:F,lastSaved:C,onRestore:$,onDismiss:k}),e.jsx("div",{className:"flex items-center justify-between",children:e.jsx(G,{onAutoFill:S,disabled:j})}),e.jsxs(q,{children:[e.jsx(Y,{className:"h-4 w-4"}),e.jsx(H,{children:"All projections are calculated automatically based on your inputs. Adjust assumptions to see different scenarios."})]}),e.jsxs(l,{children:[e.jsx(d,{children:e.jsxs(p,{className:"flex items-center gap-2",children:[e.jsx(h,{className:"w-5 h-5 text-primary","aria-hidden":"true"}),"Forecast Details"]})}),e.jsx(m,{className:"space-y-4",children:e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-4",children:[e.jsxs("div",{children:[e.jsxs(i,{htmlFor:"company_name",children:["Company Name ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(a,{id:"company_name",...r.register("company_name"),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsxs(i,{htmlFor:"forecast_period",children:["Forecast Period ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(a,{id:"forecast_period",...r.register("forecast_period"),className:"mt-1",placeholder:"2026-2028 (3 Years)"})]}),e.jsxs("div",{children:[e.jsxs(i,{htmlFor:"currency",children:["Currency ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(a,{id:"currency",...r.register("currency"),className:"mt-1"})]})]})})]}),e.jsxs(l,{children:[e.jsxs(d,{children:[e.jsxs(p,{className:"flex items-center gap-2",children:[e.jsx(U,{className:"w-5 h-5 text-primary","aria-hidden":"true"}),"Current State"]}),e.jsx(b,{children:"Your current financial position"})]}),e.jsx(m,{className:"space-y-4",children:e.jsxs("div",{className:"grid grid-cols-2 md:grid-cols-4 gap-4",children:[e.jsxs("div",{children:[e.jsx(i,{htmlFor:"current_mrr",children:"Monthly Revenue ($)"}),e.jsx(a,{id:"current_mrr",type:"number",...r.register("current_mrr",{valueAsNumber:!0}),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(i,{htmlFor:"current_customers",children:"Customers"}),e.jsx(a,{id:"current_customers",type:"number",...r.register("current_customers",{valueAsNumber:!0}),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(i,{htmlFor:"current_arpu",children:"ARPU ($)"}),e.jsx(a,{id:"current_arpu",type:"number",...r.register("current_arpu",{valueAsNumber:!0}),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(i,{htmlFor:"current_churn_rate",children:"Churn Rate (%)"}),e.jsx(a,{id:"current_churn_rate",type:"number",step:"0.1",...r.register("current_churn_rate",{valueAsNumber:!0}),className:"mt-1"})]})]})})]}),e.jsxs(l,{children:[e.jsxs(d,{children:[e.jsxs(p,{className:"flex items-center gap-2",children:[e.jsx(h,{className:"w-5 h-5 text-primary","aria-hidden":"true"}),"Scenario Assumptions"]}),e.jsx(b,{children:"Define assumptions for each scenario"})]}),e.jsxs(m,{className:"space-y-6",children:[e.jsxs("div",{className:"p-4 bg-red-50 dark:bg-red-950/20 rounded-lg space-y-4",children:[e.jsx("h4",{className:"font-semibold text-red-700 dark:text-red-400",children:"🔴 Pessimistic Scenario"}),e.jsxs("div",{className:"grid grid-cols-3 gap-4",children:[e.jsxs("div",{children:[e.jsx(i,{htmlFor:"pess_growth_rate",children:"Growth Rate (%)"}),e.jsx(a,{id:"pess_growth_rate",type:"number",...r.register("pess_growth_rate",{valueAsNumber:!0}),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(i,{htmlFor:"pess_churn_rate",children:"Churn Rate (%)"}),e.jsx(a,{id:"pess_churn_rate",type:"number",step:"0.1",...r.register("pess_churn_rate",{valueAsNumber:!0}),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(i,{htmlFor:"pess_cac",children:"CAC ($)"}),e.jsx(a,{id:"pess_cac",type:"number",...r.register("pess_cac",{valueAsNumber:!0}),className:"mt-1"})]})]})]}),e.jsxs("div",{className:"p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg space-y-4",children:[e.jsx("h4",{className:"font-semibold text-blue-700 dark:text-blue-400",children:"🔵 Base Case Scenario"}),e.jsxs("div",{className:"grid grid-cols-3 gap-4",children:[e.jsxs("div",{children:[e.jsx(i,{htmlFor:"base_growth_rate",children:"Growth Rate (%)"}),e.jsx(a,{id:"base_growth_rate",type:"number",...r.register("base_growth_rate",{valueAsNumber:!0}),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(i,{htmlFor:"base_churn_rate",children:"Churn Rate (%)"}),e.jsx(a,{id:"base_churn_rate",type:"number",step:"0.1",...r.register("base_churn_rate",{valueAsNumber:!0}),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(i,{htmlFor:"base_cac",children:"CAC ($)"}),e.jsx(a,{id:"base_cac",type:"number",...r.register("base_cac",{valueAsNumber:!0}),className:"mt-1"})]})]})]}),e.jsxs("div",{className:"p-4 bg-green-50 dark:bg-green-950/20 rounded-lg space-y-4",children:[e.jsx("h4",{className:"font-semibold text-green-700 dark:text-green-400",children:"🟢 Optimistic Scenario"}),e.jsxs("div",{className:"grid grid-cols-3 gap-4",children:[e.jsxs("div",{children:[e.jsx(i,{htmlFor:"opt_growth_rate",children:"Growth Rate (%)"}),e.jsx(a,{id:"opt_growth_rate",type:"number",...r.register("opt_growth_rate",{valueAsNumber:!0}),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(i,{htmlFor:"opt_churn_rate",children:"Churn Rate (%)"}),e.jsx(a,{id:"opt_churn_rate",type:"number",step:"0.1",...r.register("opt_churn_rate",{valueAsNumber:!0}),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(i,{htmlFor:"opt_cac",children:"CAC ($)"}),e.jsx(a,{id:"opt_cac",type:"number",...r.register("opt_cac",{valueAsNumber:!0}),className:"mt-1"})]})]})]})]})]}),e.jsxs(l,{children:[e.jsx(d,{children:e.jsxs(p,{className:"flex items-center gap-2",children:[e.jsx(I,{className:"w-5 h-5 text-primary","aria-hidden":"true"}),"Cost Structure"]})}),e.jsx(m,{className:"space-y-4",children:e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-4",children:[e.jsxs("div",{children:[e.jsx(i,{htmlFor:"fixed_costs_monthly",children:"Fixed Costs (Monthly $)"}),e.jsx(a,{id:"fixed_costs_monthly",type:"number",...r.register("fixed_costs_monthly",{valueAsNumber:!0}),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(i,{htmlFor:"variable_cost_percent",children:"Variable Costs (%)"}),e.jsx(a,{id:"variable_cost_percent",type:"number",...r.register("variable_cost_percent",{valueAsNumber:!0}),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(i,{htmlFor:"sales_marketing_percent",children:"Sales & Marketing (%)"}),e.jsx(a,{id:"sales_marketing_percent",type:"number",...r.register("sales_marketing_percent",{valueAsNumber:!0}),className:"mt-1"})]})]})})]}),e.jsxs(l,{children:[e.jsx(d,{children:e.jsxs(p,{className:"flex items-center gap-2",children:[e.jsx(h,{className:"w-5 h-5 text-primary","aria-hidden":"true"}),"Target Metrics"]})}),e.jsx(m,{className:"space-y-4",children:e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-4",children:[e.jsxs("div",{children:[e.jsx(i,{htmlFor:"ltv_target",children:"LTV Target ($)"}),e.jsx(a,{id:"ltv_target",type:"number",...r.register("ltv_target",{valueAsNumber:!0}),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(i,{htmlFor:"payback_months_target",children:"Payback Target (months)"}),e.jsx(a,{id:"payback_months_target",type:"number",...r.register("payback_months_target",{valueAsNumber:!0}),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(i,{htmlFor:"gross_margin_target",children:"Gross Margin Target (%)"}),e.jsx(a,{id:"gross_margin_target",type:"number",...r.register("gross_margin_target",{valueAsNumber:!0}),className:"mt-1"})]})]})})]})]})}export{ve as FinancialForecastForm};
//# sourceMappingURL=FinancialForecastForm-B0sShVZs.js.map
