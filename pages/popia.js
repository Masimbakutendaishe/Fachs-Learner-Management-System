import { useState } from "react";
import { useRouter } from "next/router";

export default function Popia() {
  const [consent, setConsent] = useState(false);
  const router = useRouter();

  const handleSubmit = () => {
    if (!consent) return;
    router.push("/dashboard");
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">POPIA Consent</h1>
      
      <div className="mb-6 space-y-4 max-h-[600px] overflow-y-auto border p-6 rounded-lg bg-gray-50 text-gray-800">
        <p>
          This Protection of Personal Information Act (POPIA) consent agreement (“Agreement”) 
          outlines the terms under which Fachs College (“we”, “us”, “our”) may collect, process, 
          store, and use your personal information. By ticking the checkbox below, you acknowledge 
          and consent to these terms in accordance with the provisions of POPIA, No. 4 of 2013.
        </p>

        <p>
          1. <strong>Collection of Personal Information:</strong> We may collect personal information 
          including, but not limited to, your full name, email address, phone number, physical address, 
          demographic information, educational records, assessment scores, login and usage data, 
          and any other information you voluntarily provide to us.
        </p>

        <p>
          2. <strong>Purpose of Processing:</strong> Your information will be used solely for 
          educational delivery, student support, administrative purposes, communication, 
          monitoring learning progress, evaluating course effectiveness, and complying with 
          legal obligations.
        </p>

        <p>
          3. <strong>Disclosure to Third Parties:</strong> We will not share your personal information 
          with third parties except where necessary for learning services, statutory compliance, 
          or with your express consent.
        </p>

        <p>
          4. <strong>Security and Retention:</strong> We will take appropriate technical and organizational 
          measures to protect your personal information from loss, unauthorized access, disclosure, 
          alteration, or destruction. Data will be retained only as long as necessary for the stated purposes 
          or as required by law.
        </p>

        <p>
          5. <strong>Access and Correction:</strong> You have the right to request access to your personal 
          information, request correction of inaccuracies, and withdraw consent at any time by contacting 
          our Data Protection Officer.
        </p>

        <p>
          6. <strong>Legal Acknowledgment:</strong> By providing your consent below, you acknowledge that you 
          have read, understood, and agreed to this agreement. You understand your rights under POPIA and 
          agree to the processing of your personal information as described herein. This consent remains 
          effective for the duration of your engagement with Fachs College unless revoked in writing.
        </p>

        <p>
          7. <strong>Questions or Complaints:</strong> Should you have any questions, complaints, or concerns 
          regarding our data processing practices or your rights under POPIA, please contact our Data Protection 
          Officer at dpo@fachscollege.co.za.
        </p>
      </div>

      <label className="flex items-center space-x-3 mt-6">
        <input
          type="checkbox"
          checked={consent}
          onChange={() => setConsent(!consent)}
          className="w-5 h-5"
        />
        <span>I have read and accept the POPIA terms.</span>
      </label>

      <button
        onClick={handleSubmit}
        disabled={!consent}
        className={`mt-6 px-6 py-3 rounded-xl text-white transition ${
          consent ? "bg-blue-700 hover:bg-blue-800" : "bg-gray-400 cursor-not-allowed"
        }`}
      >
        Continue to Dashboard
      </button>
    </div>
  );
}
