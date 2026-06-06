import{r as c,j as e}from"./ui-vendor-Ci_jhfUT.js";import{e as N,s as A}from"./DocsStudio-Cr5akC9A.js";import{u as w,z as s}from"./forms-5vTbOgwK.js";import{t as T}from"./zod-DDx_hEyQ.js";import{u as S,A as C}from"./useDocFormDraft-Bud_LrlS.js";import{d as l,f as p,g as m,e as d,I as n,U as I}from"./index-C7JpK5Nd.js";import{T as E}from"./textarea-CJbm1bUG.js";import{L as a}from"./label-DUkIsdlE.js";import{A as R,b as P}from"./alert-D2Y_GnKU.js";import{S as f}from"./scale-DXtEBmWV.js";import{B as D}from"./building-2-BmuadVeQ.js";import"./supabase-vendor-BXGp3RFH.js";import"./query-vendor-ouN-jH5-.js";import"./alert-dialog-BKxEo4on.js";import"./select-Bk9iz0XS.js";import"./chevron-down-BeAFGtZg.js";import"./chevron-up-DucWRmDp.js";import"./plus-C_Wh3IXV.js";import"./search-C6zDNM-a.js";import"./copy-DiM9sxD_.js";import"./trash-2-BotGUTT-.js";import"./date-utils-BcDumrce.js";import"./tabs-DKrhxIhe.js";import"./eye-off-iRplz8OT.js";import"./react-vendor-CtFdHvrH.js";import"./dialog-CtleFdjJ.js";import"./calendar-Bqj7sfJ9.js";const $=s.object({effective_date:s.string(),jurisdiction:s.string().min(5,"Jurisdiction required"),party_a_name:s.string().min(2,"Company name required"),party_a_address:s.string().min(5,"Address required"),party_a_city:s.string().min(5,"City required"),party_a_rep:s.string().min(5,"Representative required"),party_a_email:s.string().email("Valid email required"),party_b_name:s.string().min(2,"Company name required"),party_b_address:s.string().min(5,"Address required"),party_b_city:s.string().min(5,"City required"),party_b_rep:s.string().min(5,"Representative required"),party_b_email:s.string().email("Valid email required"),purpose:s.string().min(20,"Purpose must be at least 20 characters"),term_years:s.number().min(1).max(10),confidentiality_years:s.number().min(1).max(10)});function le({template:y,onGenerate:x,onPreviewUpdate:g,isGenerating:h}){const _=new Date().toISOString().split("T")[0],u=c.useMemo(()=>{const o=y?.template_json?.prefilled_content;return{effective_date:_,jurisdiction:o?.header?.jurisdiction||"State of Colorado, United States",party_a_name:o?.parties?.party_a?.legal_name||"",party_a_address:o?.parties?.party_a?.address||"",party_a_city:o?.parties?.party_a?.city_state_zip||"",party_a_rep:o?.parties?.party_a?.represented_by||"",party_a_email:o?.parties?.party_a?.email||"",party_b_name:"[Company Name]",party_b_address:"[Street Address]",party_b_city:"[City, State ZIP]",party_b_rep:"[Representative Name and Title]",party_b_email:"[Email Address]",purpose:"The Parties wish to explore a potential business relationship and may disclose confidential and proprietary information to each other in connection with this purpose.",term_years:3,confidentiality_years:5}},[y,_]),i=w({resolver:T($),defaultValues:u});S({form:i,templateId:"nda-agreement"});const r=i.watch();c.useEffect(()=>{const t=N(r),v=`
      <div style="font-family: 'DM Sans', 'Inter', sans-serif; max-width: 800px; margin: 0 auto; padding: 32px; color: #1f2937; line-height: 1.8;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="font-family: 'Sora', sans-serif; font-size: 24px; font-weight: 700; margin: 0 0 8px 0; letter-spacing: 2px;">MUTUAL NON-DISCLOSURE AGREEMENT</h1>
          <p style="color: #6b7280; font-style: italic; margin: 0;">Confidential Information Protection</p>
        </div>

        <!-- Introduction -->
        <p style="text-align: justify; margin-bottom: 24px;">
          <strong>This Mutual Non-Disclosure Agreement</strong> (the "Agreement") is entered into as of 
          <strong>${r.effective_date?new Date(r.effective_date).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}):"[Date]"}</strong> (the "Effective Date"), by and between:
        </p>

        <!-- Parties -->
        <div style="margin-bottom: 24px; padding: 20px; background: #f9fafb; border-radius: 8px;">
          <div style="margin-bottom: 16px;">
            <p style="margin: 0; font-weight: 600; color: #2563eb;">PARTY A:</p>
            <p style="margin: 4px 0 0 0;"><strong>${t.party_a_name||"[Company Name]"}</strong></p>
            <p style="margin: 2px 0; color: #6b7280;">${t.party_a_address||"[Address]"}</p>
            <p style="margin: 2px 0; color: #6b7280;">${t.party_a_city||"[City, State ZIP]"}</p>
            <p style="margin: 2px 0; color: #6b7280;">Represented by: ${t.party_a_rep||"[Representative]"}</p>
            <p style="margin: 2px 0; color: #6b7280;">Email: ${t.party_a_email||"[Email]"}</p>
          </div>
          <div>
            <p style="margin: 0; font-weight: 600; color: #2563eb;">PARTY B:</p>
            <p style="margin: 4px 0 0 0;"><strong>${t.party_b_name||"[Company Name]"}</strong></p>
            <p style="margin: 2px 0; color: #6b7280;">${t.party_b_address||"[Address]"}</p>
            <p style="margin: 2px 0; color: #6b7280;">${t.party_b_city||"[City, State ZIP]"}</p>
            <p style="margin: 2px 0; color: #6b7280;">Represented by: ${t.party_b_rep||"[Representative]"}</p>
            <p style="margin: 2px 0; color: #6b7280;">Email: ${t.party_b_email||"[Email]"}</p>
          </div>
        </div>

        <!-- Recitals -->
        <div style="margin-bottom: 24px;">
          <h2 style="font-family: 'Sora', sans-serif; font-size: 16px; font-weight: 600; margin: 0 0 12px 0; color: #2563eb;">RECITALS</h2>
          <p style="text-align: justify; margin-bottom: 12px;">
            <strong>WHEREAS,</strong> ${t.purpose||"[Purpose]"}
          </p>
          <p style="text-align: justify;">
            <strong>WHEREAS,</strong> the Parties desire to protect the confidentiality of such information and to define the terms and conditions under which Confidential Information may be disclosed and used;
          </p>
        </div>

        <!-- Agreement -->
        <p style="text-align: justify; margin-bottom: 24px;">
          <strong>NOW, THEREFORE,</strong> in consideration of the mutual covenants and agreements contained herein, the Parties agree as follows:
        </p>

        <!-- Terms -->
        <div style="margin-bottom: 24px;">
          <h2 style="font-family: 'Sora', sans-serif; font-size: 16px; font-weight: 600; margin: 0 0 12px 0; color: #2563eb;">1. DEFINITION OF CONFIDENTIAL INFORMATION</h2>
          <p style="text-align: justify; margin-bottom: 12px;">
            "Confidential Information" means any and all technical and non-technical information disclosed by either Party (the "Disclosing Party") to the other Party (the "Receiving Party"), including but not limited to:
          </p>
          <ul style="margin: 0 0 12px 20px; padding: 0;">
            <li style="margin-bottom: 8px;">Trade secrets, know-how, inventions, techniques, processes, algorithms, software programs</li>
            <li style="margin-bottom: 8px;">Business and technical information, customer lists, supplier lists</li>
            <li style="margin-bottom: 8px;">Information regarding research, development, marketing plans, budgets</li>
            <li style="margin-bottom: 8px;">Any information designated as confidential or proprietary</li>
          </ul>
        </div>

        <div style="margin-bottom: 24px;">
          <h2 style="font-family: 'Sora', sans-serif; font-size: 16px; font-weight: 600; margin: 0 0 12px 0; color: #2563eb;">2. OBLIGATIONS OF RECEIVING PARTY</h2>
          <p style="text-align: justify; margin-bottom: 8px;">
            <strong>2.1</strong> The Receiving Party agrees to hold the Confidential Information in strict confidence and to take all reasonable precautions to protect such information.
          </p>
          <p style="text-align: justify; margin-bottom: 8px;">
            <strong>2.2</strong> The Receiving Party agrees not to divulge any Confidential Information to any third person without prior written consent.
          </p>
          <p style="text-align: justify; margin-bottom: 8px;">
            <strong>2.3</strong> The Receiving Party agrees not to use the Confidential Information for any purpose except to evaluate the potential business relationship.
          </p>
        </div>

        <div style="margin-bottom: 24px;">
          <h2 style="font-family: 'Sora', sans-serif; font-size: 16px; font-weight: 600; margin: 0 0 12px 0; color: #2563eb;">3. TERM</h2>
          <p style="text-align: justify;">
            This Agreement shall remain in effect for a period of <strong>${t.term_years} (${r.term_years===1?"one":r.term_years===2?"two":r.term_years===3?"three":r.term_years}) year${r.term_years>1?"s":""}</strong> from the Effective Date. The obligations of the Receiving Party shall survive for a period of <strong>${t.confidentiality_years} (${r.confidentiality_years===1?"one":r.confidentiality_years===2?"two":r.confidentiality_years===3?"three":r.confidentiality_years===4?"four":r.confidentiality_years===5?"five":r.confidentiality_years}) year${r.confidentiality_years>1?"s":""}</strong> from the date of disclosure.
          </p>
        </div>

        <div style="margin-bottom: 24px;">
          <h2 style="font-family: 'Sora', sans-serif; font-size: 16px; font-weight: 600; margin: 0 0 12px 0; color: #2563eb;">4. GOVERNING LAW</h2>
          <p style="text-align: justify;">
            This Agreement shall be governed by and construed in accordance with the laws of <strong>${t.jurisdiction||"[Jurisdiction]"}</strong>, without regard to its conflicts of law provisions.
          </p>
        </div>

        <div style="margin-bottom: 24px;">
          <h2 style="font-family: 'Sora', sans-serif; font-size: 16px; font-weight: 600; margin: 0 0 12px 0; color: #2563eb;">5. ADDITIONAL PROVISIONS</h2>
          <p style="text-align: justify; margin-bottom: 8px;">
            <strong>5.1 Entire Agreement:</strong> This Agreement constitutes the entire agreement between the Parties with respect to the subject matter hereof.
          </p>
          <p style="text-align: justify; margin-bottom: 8px;">
            <strong>5.2 Amendments:</strong> This Agreement may be amended only by a written instrument executed by both Parties.
          </p>
          <p style="text-align: justify; margin-bottom: 8px;">
            <strong>5.3 Severability:</strong> If any provision is found invalid, the remaining provisions shall continue in full force and effect.
          </p>
          <p style="text-align: justify;">
            <strong>5.4 Counterparts:</strong> This Agreement may be executed in counterparts, each of which shall be deemed an original.
          </p>
        </div>

        <!-- Signature Blocks -->
        <div style="margin-top: 48px; page-break-inside: avoid;">
          <p style="text-align: center; margin-bottom: 32px; font-weight: 600;">
            IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.
          </p>
          
          <div style="display: flex; justify-content: space-between; gap: 48px;">
            <div style="flex: 1;">
              <p style="font-weight: 600; color: #2563eb; margin: 0 0 24px 0;">${t.party_a_name||"PARTY A"}</p>
              <div style="border-bottom: 1px solid #000; margin-bottom: 8px; height: 40px;"></div>
              <p style="margin: 4px 0; font-size: 14px;">By: ${t.party_a_rep||"[Name]"}</p>
              <p style="margin: 4px 0; font-size: 14px;">Title: ${t.party_a_rep?.split(",")[1]?.trim()||"[Title]"}</p>
              <p style="margin: 4px 0; font-size: 14px;">Date: _______________________</p>
            </div>
            <div style="flex: 1;">
              <p style="font-weight: 600; color: #2563eb; margin: 0 0 24px 0;">${t.party_b_name||"PARTY B"}</p>
              <div style="border-bottom: 1px solid #000; margin-bottom: 8px; height: 40px;"></div>
              <p style="margin: 4px 0; font-size: 14px;">By: ${t.party_b_rep||"[Name]"}</p>
              <p style="margin: 4px 0; font-size: 14px;">Title: ${t.party_b_rep?.split(",")[1]?.trim()||"[Title]"}</p>
              <p style="margin: 4px 0; font-size: 14px;">Date: _______________________</p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 11px;">
          <p style="color: #dc2626; font-weight: 600;">CONFIDENTIAL - Unauthorized distribution is prohibited</p>
          <p>This document is a template and should be reviewed by legal counsel before execution.</p>
          <p style="margin-top: 8px; font-size: 10px; color: #d1d5db;">Generated with <a href="https://aiwmcquantis.com" style="color: #3B82F6; text-decoration: none;">AIWMC Quantis</a></p>
        </div>
      </div>
    `;g(A(v))},[r,g]);const b=t=>{x({header:{effective_date:t.effective_date,jurisdiction:t.jurisdiction},parties:{party_a:{legal_name:t.party_a_name,address:t.party_a_address,city_state_zip:t.party_a_city,represented_by:t.party_a_rep,email:t.party_a_email},party_b:{legal_name:t.party_b_name,address:t.party_b_address,city_state_zip:t.party_b_city,represented_by:t.party_b_rep,email:t.party_b_email}},terms:{purpose:t.purpose,term_years:t.term_years,confidentiality_years:t.confidentiality_years}})},j=c.useCallback(t=>{t.company_name&&i.setValue("party_a_name",t.company_name),t.company_city&&i.setValue("party_a_city",t.company_city)},[i]);return e.jsxs("form",{onSubmit:i.handleSubmit(b),className:"space-y-6",children:[e.jsx("div",{className:"flex items-center justify-between mb-2",children:e.jsx(C,{onAutoFill:j,disabled:h})}),e.jsxs(R,{className:"border-amber-500/50 bg-amber-50 dark:bg-amber-950/20",children:[e.jsx(f,{className:"h-4 w-4 text-amber-600"}),e.jsx(P,{className:"text-amber-800 dark:text-amber-200",children:"This is a template for informational purposes. Consult with a qualified attorney before using this agreement for any legal purpose."})]}),e.jsxs(l,{children:[e.jsx(p,{children:e.jsxs(m,{className:"flex items-center gap-2",children:[e.jsx(f,{className:"w-5 h-5 text-primary"}),"Agreement Details"]})}),e.jsxs(d,{className:"space-y-4",children:[e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsx(a,{children:"Effective Date *"}),e.jsx(n,{type:"date",...i.register("effective_date"),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(a,{children:"Governing Jurisdiction *"}),e.jsx(n,{...i.register("jurisdiction"),className:"mt-1",placeholder:"State of Colorado, United States"})]})]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsx(a,{children:"Agreement Term (Years)"}),e.jsx(n,{type:"number",min:1,max:10,...i.register("term_years",{valueAsNumber:!0}),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(a,{children:"Confidentiality Period (Years)"}),e.jsx(n,{type:"number",min:1,max:10,...i.register("confidentiality_years",{valueAsNumber:!0}),className:"mt-1"})]})]})]})]}),e.jsxs(l,{children:[e.jsx(p,{children:e.jsxs(m,{className:"flex items-center gap-2",children:[e.jsx(D,{className:"w-5 h-5 text-primary"}),"Party A (Your Company)"]})}),e.jsxs(d,{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsx(a,{children:"Legal Company Name *"}),e.jsx(n,{...i.register("party_a_name"),className:"mt-1"})]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsx(a,{children:"Street Address *"}),e.jsx(n,{...i.register("party_a_address"),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(a,{children:"City, State ZIP *"}),e.jsx(n,{...i.register("party_a_city"),className:"mt-1"})]})]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsx(a,{children:"Represented By (Name & Title) *"}),e.jsx(n,{...i.register("party_a_rep"),className:"mt-1",placeholder:"John Doe, CEO"})]}),e.jsxs("div",{children:[e.jsx(a,{children:"Contact Email *"}),e.jsx(n,{type:"email",...i.register("party_a_email"),className:"mt-1"})]})]})]})]}),e.jsxs(l,{children:[e.jsx(p,{children:e.jsxs(m,{className:"flex items-center gap-2",children:[e.jsx(I,{className:"w-5 h-5 text-primary"}),"Party B (Other Company)"]})}),e.jsxs(d,{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsx(a,{children:"Legal Company Name *"}),e.jsx(n,{...i.register("party_b_name"),className:"mt-1"})]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsx(a,{children:"Street Address *"}),e.jsx(n,{...i.register("party_b_address"),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(a,{children:"City, State ZIP *"}),e.jsx(n,{...i.register("party_b_city"),className:"mt-1"})]})]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsx(a,{children:"Represented By (Name & Title) *"}),e.jsx(n,{...i.register("party_b_rep"),className:"mt-1",placeholder:"Jane Smith, CFO"})]}),e.jsxs("div",{children:[e.jsx(a,{children:"Contact Email *"}),e.jsx(n,{type:"email",...i.register("party_b_email"),className:"mt-1"})]})]})]})]}),e.jsxs(l,{children:[e.jsx(p,{children:e.jsx(m,{children:"Purpose of Agreement"})}),e.jsx(d,{children:e.jsxs("div",{children:[e.jsx(a,{children:"Describe the business relationship being explored *"}),e.jsx(E,{...i.register("purpose"),rows:4,className:"mt-1"}),i.formState.errors.purpose&&e.jsx("p",{className:"text-sm text-destructive mt-1",children:i.formState.errors.purpose.message})]})})]})]})}export{le as NDAForm};
//# sourceMappingURL=NDAForm-BXQYUTjT.js.map
