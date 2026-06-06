import{r as p,j as e}from"./ui-vendor-Ci_jhfUT.js";import{e as S,s as T}from"./DocsStudio-Cr5akC9A.js";import{u as V,z as r}from"./forms-5vTbOgwK.js";import{t as q}from"./zod-DDx_hEyQ.js";import{u as P,A as C}from"./useDocFormDraft-Bud_LrlS.js";import{D}from"./DocDraftBanner-WLCzG5c7.js";import{d as n,f as l,g as o,F as O,e as m,I as a,an as c,ak as h,am as E,ai as R}from"./index-C7JpK5Nd.js";import{T as d}from"./textarea-CJbm1bUG.js";import{L as t}from"./label-DUkIsdlE.js";import"./supabase-vendor-BXGp3RFH.js";import"./query-vendor-ouN-jH5-.js";import"./alert-dialog-BKxEo4on.js";import"./select-Bk9iz0XS.js";import"./chevron-down-BeAFGtZg.js";import"./chevron-up-DucWRmDp.js";import"./plus-C_Wh3IXV.js";import"./search-C6zDNM-a.js";import"./copy-DiM9sxD_.js";import"./trash-2-BotGUTT-.js";import"./date-utils-BcDumrce.js";import"./tabs-DKrhxIhe.js";import"./scale-DXtEBmWV.js";import"./eye-off-iRplz8OT.js";import"./react-vendor-CtFdHvrH.js";import"./dialog-CtleFdjJ.js";import"./calendar-Bqj7sfJ9.js";import"./rotate-ccw-Y5oj2zEL.js";const I=r.object({company_name:r.string().min(2,"Company name required"),tagline:r.string().min(5,"Tagline required"),website:r.string().optional(),contact_email:r.string().email().optional(),vision:r.string().min(10,"Vision statement required"),mission:r.string().min(10,"Mission statement required"),problem:r.string().min(20,"Problem description required"),solution:r.string().min(20,"Solution description required"),target_customer:r.string().min(10,"Target customer required"),market_size:r.string().min(5,"Market size required"),value_proposition:r.string().min(20,"Value proposition required"),key_differentiator:r.string().min(10,"Differentiator required"),revenue_streams:r.string().min(10,"Revenue streams required"),pricing:r.string().min(5,"Pricing required"),metric_1_name:r.string().min(2,"Metric name required"),metric_1_value:r.string().min(1,"Metric value required"),metric_2_name:r.string().min(2,"Metric name required"),metric_2_value:r.string().min(1,"Metric value required"),metric_3_name:r.string().min(2,"Metric name required"),metric_3_value:r.string().min(1,"Metric value required"),founders:r.string().min(5,"Founders required"),team_size:r.string().optional(),short_term_goals:r.string().min(10,"Short-term goals required"),long_term_goals:r.string().min(10,"Long-term goals required")});function ge({template:u,onGenerate:f,onPreviewUpdate:x,isGenerating:_}){const j=p.useMemo(()=>({company_name:"",tagline:"",website:"",contact_email:"",vision:"",mission:"",problem:"",solution:"",target_customer:"",market_size:"",value_proposition:"",key_differentiator:"",revenue_streams:"",pricing:"",metric_1_name:"Revenue",metric_1_value:"",metric_2_name:"Customers",metric_2_value:"",metric_3_name:"Growth",metric_3_value:"",founders:"",team_size:"",short_term_goals:"",long_term_goals:""}),[u]),i=V({resolver:q(I),defaultValues:j}),{hasDraft:v,draftAge:y,isSaving:b,lastSaved:N,restoreDraft:z,dismissDraft:w,clearDraft:F}=P({form:i,templateId:"one-page-plan"}),g=i.watch();p.useEffect(()=>{const s=S(g),$=`
      <div style="font-family: 'DM Sans', 'Inter', sans-serif; max-width: 800px; margin: 0 auto; padding: 24px; color: #1f2937;">
        <!-- Header -->
        <div style="text-align: center; padding: 24px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; border-radius: 12px; margin-bottom: 24px;">
          <h1 style="font-family: 'Sora', sans-serif; font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.02em;">${s.company_name||"Company"}</h1>
          <p style="font-size: 16px; margin: 8px 0 0 0; opacity: 0.9;">${s.tagline||"Tagline"}</p>
          ${s.website?`<p style="font-size: 12px; margin: 12px 0 0 0; opacity: 0.8;">${s.website} • ${s.contact_email||""}</p>`:""}
        </div>

        <!-- Main Grid -->
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
          
          <!-- Vision & Mission -->
          <div style="padding: 16px; background: #f0f9ff; border-radius: 8px; border-left: 4px solid #2563eb;">
            <h3 style="font-size: 12px; font-weight: 600; color: #2563eb; margin: 0 0 8px 0;">VISION</h3>
            <p style="font-size: 13px; margin: 0; line-height: 1.5;">${s.vision||""}</p>
          </div>
          
          <div style="padding: 16px; background: #f0f9ff; border-radius: 8px; border-left: 4px solid #2563eb;">
            <h3 style="font-size: 12px; font-weight: 600; color: #2563eb; margin: 0 0 8px 0;">MISSION</h3>
            <p style="font-size: 13px; margin: 0; line-height: 1.5;">${s.mission||""}</p>
          </div>

          <!-- Problem & Solution -->
          <div style="padding: 16px; background: #fef2f2; border-radius: 8px; border-left: 4px solid #dc2626;">
            <h3 style="font-size: 12px; font-weight: 600; color: #dc2626; margin: 0 0 8px 0;">PROBLEM</h3>
            <p style="font-size: 13px; margin: 0; line-height: 1.5;">${s.problem||""}</p>
          </div>
          
          <div style="padding: 16px; background: #ecfdf5; border-radius: 8px; border-left: 4px solid #10b981;">
            <h3 style="font-size: 12px; font-weight: 600; color: #10b981; margin: 0 0 8px 0;">SOLUTION</h3>
            <p style="font-size: 13px; margin: 0; line-height: 1.5;">${s.solution||""}</p>
          </div>

          <!-- Target Market -->
          <div style="padding: 16px; background: #faf5ff; border-radius: 8px; border-left: 4px solid #9333ea;">
            <h3 style="font-size: 12px; font-weight: 600; color: #9333ea; margin: 0 0 8px 0;">TARGET CUSTOMER</h3>
            <p style="font-size: 13px; margin: 0; line-height: 1.5;">${s.target_customer||""}</p>
            <p style="font-size: 12px; color: #6b7280; margin: 8px 0 0 0;"><strong>Market:</strong> ${s.market_size||""}</p>
          </div>

          <!-- Value Proposition -->
          <div style="padding: 16px; background: #fefce8; border-radius: 8px; border-left: 4px solid #ca8a04;">
            <h3 style="font-size: 12px; font-weight: 600; color: #ca8a04; margin: 0 0 8px 0;">VALUE PROPOSITION</h3>
            <p style="font-size: 13px; margin: 0; line-height: 1.5;">${s.value_proposition||""}</p>
            <p style="font-size: 12px; color: #6b7280; margin: 8px 0 0 0;"><strong>Differentiator:</strong> ${s.key_differentiator||""}</p>
          </div>

          <!-- Revenue Model -->
          <div style="grid-column: span 2; padding: 16px; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #16a34a;">
            <h3 style="font-size: 12px; font-weight: 600; color: #16a34a; margin: 0 0 8px 0;">REVENUE MODEL</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <p style="font-size: 13px; margin: 0;"><strong>Streams:</strong> ${s.revenue_streams||""}</p>
              <p style="font-size: 13px; margin: 0;"><strong>Pricing:</strong> ${s.pricing||""}</p>
            </div>
          </div>

          <!-- Key Metrics -->
          <div style="grid-column: span 2; padding: 16px; background: #f9fafb; border-radius: 8px;">
            <h3 style="font-size: 12px; font-weight: 600; color: #374151; margin: 0 0 12px 0;">KEY METRICS</h3>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
              <div style="text-align: center; padding: 12px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">
                <p style="font-size: 20px; font-weight: 700; color: #2563eb; margin: 0; font-family: 'JetBrains Mono', monospace;">${s.metric_1_value||"-"}</p>
                <p style="font-size: 11px; color: #6b7280; margin: 4px 0 0 0;">${s.metric_1_name||""}</p>
              </div>
              <div style="text-align: center; padding: 12px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">
                <p style="font-size: 20px; font-weight: 700; color: #10b981; margin: 0; font-family: 'JetBrains Mono', monospace;">${s.metric_2_value||"-"}</p>
                <p style="font-size: 11px; color: #6b7280; margin: 4px 0 0 0;">${s.metric_2_name||""}</p>
              </div>
              <div style="text-align: center; padding: 12px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">
                <p style="font-size: 20px; font-weight: 700; color: #9333ea; margin: 0; font-family: 'JetBrains Mono', monospace;">${s.metric_3_value||"-"}</p>
                <p style="font-size: 11px; color: #6b7280; margin: 4px 0 0 0;">${s.metric_3_name||""}</p>
              </div>
            </div>
          </div>

          <!-- Team -->
          <div style="padding: 16px; background: #fff7ed; border-radius: 8px; border-left: 4px solid #ea580c;">
            <h3 style="font-size: 12px; font-weight: 600; color: #ea580c; margin: 0 0 8px 0;">TEAM</h3>
            <p style="font-size: 13px; margin: 0; line-height: 1.5;">${s.founders||""}</p>
            ${s.team_size?`<p style="font-size: 12px; color: #6b7280; margin: 8px 0 0 0;">${s.team_size}</p>`:""}
          </div>

          <!-- Goals -->
          <div style="padding: 16px; background: #f0f9ff; border-radius: 8px; border-left: 4px solid #2563eb;">
            <h3 style="font-size: 12px; font-weight: 600; color: #2563eb; margin: 0 0 8px 0;">GOALS</h3>
            <p style="font-size: 12px; margin: 0;"><strong>Short-term:</strong> ${s.short_term_goals||""}</p>
            <p style="font-size: 12px; margin: 8px 0 0 0;"><strong>Long-term:</strong> ${s.long_term_goals||""}</p>
          </div>
        </div>

        <!-- Footer -->
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 11px;">
          <p>One-Page Business Plan - ${s.company_name||"Company"} © ${new Date().getFullYear()}</p>
          <p style="margin-top: 4px; font-size: 10px;">Generated with <a href="https://aiwmcquantis.com" style="color: #3B82F6; text-decoration: none;">AIWMC Quantis</a></p>
        </div>
      </div>
    `;x(T($))},[g,x]);const M=s=>{F(),f(s)},k=p.useCallback(s=>{s.company_name&&i.setValue("company_name",s.company_name),s.monthly_revenue&&(i.setValue("metric_1_name","Monthly Revenue"),i.setValue("metric_1_value",`$${s.monthly_revenue.toLocaleString()}`)),s.roi&&(i.setValue("metric_2_name","ROI"),i.setValue("metric_2_value",`${s.roi}%`))},[i]);return e.jsxs("form",{onSubmit:i.handleSubmit(M),className:"space-y-6","aria-label":"One-Page Business Plan Form",children:[e.jsx(D,{hasDraft:v,draftAge:y,isSaving:b,lastSaved:N,onRestore:z,onDismiss:w}),e.jsx("div",{className:"flex items-center justify-between",children:e.jsx(C,{onAutoFill:k,disabled:_})}),e.jsxs(n,{children:[e.jsx(l,{children:e.jsxs(o,{className:"flex items-center gap-2",children:[e.jsx(O,{className:"w-5 h-5 text-primary","aria-hidden":"true"}),"Company Header"]})}),e.jsxs(m,{className:"space-y-4",children:[e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"company_name",children:["Company Name ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(a,{id:"company_name",...i.register("company_name"),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"tagline",children:["Tagline ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(a,{id:"tagline",...i.register("tagline"),className:"mt-1"})]})]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsx(t,{htmlFor:"website",children:"Website"}),e.jsx(a,{id:"website",...i.register("website"),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(t,{htmlFor:"contact_email",children:"Contact Email"}),e.jsx(a,{id:"contact_email",type:"email",...i.register("contact_email"),className:"mt-1"})]})]})]})]}),e.jsxs(n,{children:[e.jsx(l,{children:e.jsxs(o,{className:"flex items-center gap-2",children:[e.jsx(c,{className:"w-5 h-5 text-primary","aria-hidden":"true"}),"Vision & Mission"]})}),e.jsxs(m,{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"vision",children:["Vision ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(d,{id:"vision",...i.register("vision"),rows:2,className:"mt-1",placeholder:"Where you see the company in the future"})]}),e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"mission",children:["Mission ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(d,{id:"mission",...i.register("mission"),rows:2,className:"mt-1",placeholder:"Your purpose and how you achieve it"})]})]})]}),e.jsxs(n,{children:[e.jsx(l,{children:e.jsxs(o,{className:"flex items-center gap-2",children:[e.jsx(c,{className:"w-5 h-5 text-primary","aria-hidden":"true"}),"Problem & Solution"]})}),e.jsxs(m,{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"problem",children:["Problem ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(d,{id:"problem",...i.register("problem"),rows:2,className:"mt-1"})]}),e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"solution",children:["Solution ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(d,{id:"solution",...i.register("solution"),rows:2,className:"mt-1"})]})]})]}),e.jsxs(n,{children:[e.jsx(l,{children:e.jsxs(o,{className:"flex items-center gap-2",children:[e.jsx(h,{className:"w-5 h-5 text-primary","aria-hidden":"true"}),"Target Market"]})}),e.jsx(m,{className:"space-y-4",children:e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"target_customer",children:["Target Customer ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(d,{id:"target_customer",...i.register("target_customer"),rows:2,className:"mt-1"})]}),e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"market_size",children:["Market Size ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(a,{id:"market_size",...i.register("market_size"),className:"mt-1",placeholder:"$150B, growing 42% annually"})]})]})})]}),e.jsxs(n,{children:[e.jsx(l,{children:e.jsxs(o,{className:"flex items-center gap-2",children:[e.jsx(c,{className:"w-5 h-5 text-primary","aria-hidden":"true"}),"Value Proposition"]})}),e.jsxs(m,{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"value_proposition",children:["Value Proposition ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(d,{id:"value_proposition",...i.register("value_proposition"),rows:2,className:"mt-1"})]}),e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"key_differentiator",children:["Key Differentiator ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(a,{id:"key_differentiator",...i.register("key_differentiator"),className:"mt-1"})]})]})]}),e.jsxs(n,{children:[e.jsx(l,{children:e.jsxs(o,{className:"flex items-center gap-2",children:[e.jsx(E,{className:"w-5 h-5 text-primary","aria-hidden":"true"}),"Revenue Model"]})}),e.jsx(m,{className:"space-y-4",children:e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"revenue_streams",children:["Revenue Streams ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(a,{id:"revenue_streams",...i.register("revenue_streams"),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"pricing",children:["Pricing ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(a,{id:"pricing",...i.register("pricing"),className:"mt-1"})]})]})})]}),e.jsxs(n,{children:[e.jsxs(l,{children:[e.jsxs(o,{className:"flex items-center gap-2",children:[e.jsx(c,{className:"w-5 h-5 text-primary","aria-hidden":"true"}),"Key Metrics"]}),e.jsx(R,{children:"Three headline metrics that show traction"})]}),e.jsx(m,{className:"space-y-4",children:e.jsxs("div",{className:"grid grid-cols-2 md:grid-cols-6 gap-4",children:[e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"metric_1_name",children:["Metric 1 Name ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(a,{id:"metric_1_name",...i.register("metric_1_name"),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"metric_1_value",children:["Value ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(a,{id:"metric_1_value",...i.register("metric_1_value"),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"metric_2_name",children:["Metric 2 Name ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(a,{id:"metric_2_name",...i.register("metric_2_name"),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"metric_2_value",children:["Value ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(a,{id:"metric_2_value",...i.register("metric_2_value"),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"metric_3_name",children:["Metric 3 Name ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(a,{id:"metric_3_name",...i.register("metric_3_name"),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"metric_3_value",children:["Value ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(a,{id:"metric_3_value",...i.register("metric_3_value"),className:"mt-1"})]})]})})]}),e.jsxs(n,{children:[e.jsx(l,{children:e.jsxs(o,{className:"flex items-center gap-2",children:[e.jsx(h,{className:"w-5 h-5 text-primary","aria-hidden":"true"}),"Team & Goals"]})}),e.jsxs(m,{className:"space-y-4",children:[e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"founders",children:["Founders ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(a,{id:"founders",...i.register("founders"),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(t,{htmlFor:"team_size",children:"Team Size"}),e.jsx(a,{id:"team_size",...i.register("team_size"),className:"mt-1"})]})]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"short_term_goals",children:["Short-term Goals ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(d,{id:"short_term_goals",...i.register("short_term_goals"),rows:2,className:"mt-1"})]}),e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"long_term_goals",children:["Long-term Goals ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(d,{id:"long_term_goals",...i.register("long_term_goals"),rows:2,className:"mt-1"})]})]})]})]})]})}export{ge as OnePagePlanForm};
//# sourceMappingURL=OnePagePlanForm-DoMPIvbZ.js.map
