"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase"; // default export
import { getCurrentUserId } from "./AuthModal"; // import the helper

export default function PaymentModal({ isOpen, onClose, programme }) {
  const [method, setMethod] = useState("paypal");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [isOpen]);

  const handlePay = () => {
    const userId = getCurrentUserId();
    console.log("💳 [Step 1] User ID at Pay stage:", userId);
    setStep(2);
  };

 const handleConfirm = async () => {
  setLoading(true);
  const userId = getCurrentUserId();
  console.log("🔑 [Step 2] User ID at Confirm OTP stage:", userId);

  if (!userId) {
    alert("User not logged in. Please sign in first.");
    setLoading(false);
    return;
  }

  try {
    const { data, error } = await supabase
      .from("enrollments")
      .update({ payment_status: "paid" })
      .eq("user_id", userId)
      .eq("programme_id", programme.id)
      .eq("payment_status", "failed"); // only update failed payments

    if (error) {
      alert("Payment failed: " + error.message);
    } else {
      console.log("💾 Supabase update response:", data);
      console.log("✅ Payment success for user ID:", userId);
      setStep(3); // immediately show success
    }
  } catch (err) {
    console.error("❌ Payment error for user ID:", userId, err);
    alert("Payment failed: " + err.message);
  } finally {
    setLoading(false);
  }
};


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-gray-900">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-900 hover:text-gray-700 font-bold"
        >
          ✕
        </button>

        {step === 1 && (
          <>
            <h3 className="text-2xl font-bold mb-4 text-gray-900">
              Payment for {programme.title}
            </h3>

            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full mb-3 p-3 border rounded-lg text-gray-900 bg-white"
            >
              <option value="paypal">PayPal</option>
              <option value="visa">Visa</option>
              <option value="mastercard">MasterCard</option>
            </select>

            {(method === "visa" || method === "mastercard") && (
              <>
                <input
                  type="text"
                  placeholder="Card Number"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full mb-2 p-3 border rounded-lg text-gray-900 bg-white"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    className="w-1/2 p-3 border rounded-lg text-gray-900 bg-white"
                  />
                  <input
                    type="text"
                    placeholder="CVV"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    className="w-1/2 p-3 border rounded-lg text-gray-900 bg-white"
                  />
                </div>
              </>
            )}

            <button
              onClick={handlePay}
              className="mt-4 w-full py-3 bg-red-800 text-white rounded-xl hover:bg-red-900 transition font-semibold"
            >
              Pay
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h3 className="text-2xl font-bold mb-4 text-gray-900">Confirm OTP</h3>
            <p className="text-gray-800 mb-2">
              A confirmation code was sent to your phone/email.
            </p>
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full mb-4 p-3 border rounded-lg text-gray-900 bg-white"
            />
            <button
              onClick={handleConfirm}
              disabled={loading}
              className={`w-full py-3 rounded-xl font-semibold text-white transition ${
                loading ? "bg-gray-400 cursor-not-allowed" : "bg-red-800 hover:bg-red-900"
              }`}
            >
              {loading ? "Processing..." : "Confirm"}
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <h3 className="text-2xl font-bold mb-4 text-center text-gray-900">
              Payment Successful!
            </h3>
            <p className="text-center text-gray-800">You are now enrolled in {programme.title}.</p>
            <button
              onClick={onClose}
              className="mt-6 w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-semibold"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}
