"use client";

import React, { useEffect } from "react";
import { useState, useRef, type FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSearchParams } from "next/navigation";
import { loadMercadoPago } from "@mercadopago/sdk-js";
import axios from "axios";

interface CheckoutFormProps {
  // onSubmit?: (data: CheckoutFormData) => Promise<void>;
  bill_amount: number;
  className?: string;
}

const MercadoPagoCheckout: React.FC<CheckoutFormProps> = ({
  bill_amount,
  className,
}) => {
  const [isMercadoPagoReady, setIsMercadoPagoReady] = useState(false);
  const searchParams = useSearchParams();

  // On Hydration, load Mercado Pago
  useEffect(() => {
    const loadSDK = async () => {
      try {
        await loadMercadoPago();
        if (typeof window !== "undefined" && window.MercadoPago) {
          setIsMercadoPagoReady(true);
        } else {
          throw new Error("MercadoPago SDK no se cargó correctamente.");
        }
      } catch (sdkError) {
        console.error("MercadoPago SDK loading error:", sdkError);
      }
    };

    // Load the SDK, if its not already loaded, and the amount is non-zero
    if (!isMercadoPagoReady && bill_amount > 0) {
      loadSDK();
    }
  }, [isMercadoPagoReady]);

  useEffect(() => {
    let cardForm: any = null;

    const initializeForm = async () => {
      if (
        !isMercadoPagoReady ||
        !document.getElementById("form-checkout") ||
        bill_amount <= 0
      ) {
        return;
      }

      try {
        // setIsLoading(true);
        // setError(null);

        const mp = new window.MercadoPago(
          process.env.NEXT_PUBLIC_MP_PUBLIC_KEY!
        );

        cardForm = mp.cardForm({
          amount: String(bill_amount),
          iframe: true,
          form: {
            id: "form-checkout",
            cardNumber: {
              id: "form-checkout__cardNumber",
              placeholder: "Número de tarjeta",
            },
            expirationDate: {
              id: "form-checkout__expirationDate",
              placeholder: "MM/YY",
            },
            securityCode: {
              id: "form-checkout__securityCode",
              placeholder: "Código de seguridad",
            },
            cardholderName: {
              id: "form-checkout__cardholderName",
              placeholder: "Titular de la tarjeta",
            },
            issuer: {
              id: "form-checkout__issuer",
              placeholder: "Banco emisor",
            },
            installments: {
              id: "form-checkout__installments",
              placeholder: "Cuotas",
            },
            identificationType: {
              id: "form-checkout__identificationType",
              placeholder: "Tipo de documento",
            },
            identificationNumber: {
              id: "form-checkout__identificationNumber",
              placeholder: "Número del documento",
            },
            cardholderEmail: {
              id: "form-checkout__cardholderEmail",
              placeholder: "E-mail",
            },
          },
          callbacks: {
            onFormMounted: (error: any) => {
              // setIsLoading(false);
              if (error) {
                console.error("MercadoPago form mount error:", error);
                // setError(
                //   "Error al cargar el formulario de pago: " + error.message
                // );
                return;
              }
            },
            onSubmit: async (event: { preventDefault: () => void }) => {
              event.preventDefault();
              // setIsLoading(true);
              // setError(null);

              try {
                // Enviar pago
                // Para continuar con el proceso de integración de pagos con tarjeta, es necesario que el backend reciba la información del formulario con el token generado y los datos completos como se indicó en las anteriores etapas.

                // En el ejemplo de la sección previa, enviamos todos los datos necesarios para la generación del pago al endpoint process_payment del backend .

                // Con toda la información recopilada en el backend , envía un POST con los atributos requeridos, prestando atención a los parámetros token, transaction_amount, installments, payment_method_id y payer.email al endpoint /v1/payments y ejecuta la solicitud o, si lo prefieres, envía la información utilizando nuestros SDKs.
                const cardFormData = cardForm.getCardFormData();

                await axios.post("/api/process_payment", {
                  token: cardFormData.token,
                  issuer_id: cardFormData.issuerId,
                  payment_method_id: cardFormData.paymentMethodId,
                  transaction_amount: Number(cardFormData.amount),
                  installments: Number(cardFormData.installments),
                  payer: {
                    email: cardFormData.cardholderEmail,
                    identification: {
                      type: cardFormData.identificationType,
                      number: cardFormData.identificationNumber,
                    },
                  },
                  // description: `Pago para mesa ${
                  //   tableNumber || tableuuid?.slice(-4)
                  // }, Factura ID: ${bill.id}`,
                  
                  // metadata: {
                  //   bill_id: bill.id,
                  //   table_number: tableNumber,
                  //   table_uuid: tableuuid,
                  // },
                });

                // setChecked(false);
                // setClientPaymentAmount("0");
                // setRawInputValue("");
                // fetchBillData();
              } catch (paymentError: any) {
                console.error("Payment processing error:", paymentError);
                // setError(
                //   paymentError.response?.data?.message ||
                //     "Error al procesar el pago. Por favor intente nuevamente."
                // );
              } finally {
                // setIsLoading(false);
              }
            },
            onFetching: (resource: string) => {
              // setIsLoading(true);
              return () => {
                // setIsLoading(false);
              };
            },
            onError: (error: any) => {
              // setIsLoading(false);
              console.error("MercadoPago CardForm error:", error);
              let errorMessage = "Error en el formulario de pago. ";
              if (error.message) {
                errorMessage += error.message;
              } else if (Array.isArray(error) && error.length > 0) {
                errorMessage += error.map((e) => e.message).join(", ");
              }
              // setError(errorMessage);
            },
          },
        });
      } catch (initError) {
        console.error("MercadoPago initialization error:", initError);
        // setError(
        //   "Error al inicializar MercadoPago: " + (initError as Error).message
        // );
        // setIsLoading(false);
      }
    };

    if (isMercadoPagoReady && bill_amount > 0) {
      initializeForm();
    }

    return () => {
      if (cardForm) {
        try {
          cardForm.unmount();
        } catch (unmountError) {
          console.warn("Error unmounting MercadoPago card form:", unmountError);
        }
      }
    };
  }, [isMercadoPagoReady]);

  // La captura de los datos de la tarjeta se realiza a través del CardForm de la biblioteca MercadoPago.js. Nuestro CardForm se conectará a tu formulario de pago HTML, facilitando la obtención y validación de todos los datos necesarios para procesar el pago.
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-[420px] max-h-[90vh] overflow-y-auto shadow-xl border-0 dark:border dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800">
        <CardHeader className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-800 dark:to-purple-800 text-white rounded-t-2xl sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold">Su factura</CardTitle>
            <div className="bg-white/20 dark:bg-white/10 px-3 py-1 rounded-full text-sm font-medium">
              Mesa #{tableNumber || tableuuid?.slice(-4)}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6 bg-white dark:bg-slate-800">
          {billData?.bill ? (
            <>
              {/* Bill Summary Card */}
              <div className="bg-indigo-50 dark:bg-slate-700/50 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Receipt className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2" />
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      Resumen de Factura
                    </h3>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      billData.bill.isPaid
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                        : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                    }`}
                  >
                    {billData.bill.isPaid ? "Pagada" : "Activa"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Total
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      ${totalAmount.toFixed(2)}
                    </p>
                  </div>
                  <div className="border-l border-indigo-100 dark:border-slate-600 pl-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Pagado
                    </p>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      ${paidAmount.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="mb-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Saldo Restante
                  </p>
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    ${remainingAmount.toFixed(2)}
                  </p>
                </div>

                {/* Progress bar */}
                {!billData.bill.isPaid && totalAmount > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Progreso del pago
                      </p>
                      <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                        {paymentProgress.toFixed(0)}%
                      </p>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all duration-500 ease-in-out"
                        style={{ width: `${paymentProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Toggle */}
              {!billData.bill.isPaid && remainingAmount > 0 && (
                <div className="flex items-center justify-between bg-white dark:bg-slate-700 p-4 rounded-xl border border-gray-100 dark:border-slate-600 shadow-sm">
                  <label
                    htmlFor="tableCheckbox"
                    className="text-sm font-medium text-gray-700 dark:text-gray-200"
                  >
                    ¿Quieres realizar un pago?
                  </label>
                  <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full">
                    <input
                      type="checkbox"
                      id="tableCheckbox"
                      checked={checked}
                      onChange={handleCheckChange}
                      disabled={isLoading}
                      className="absolute w-0 h-0 opacity-0"
                    />
                    <label
                      htmlFor="tableCheckbox"
                      className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-all duration-200 ${
                        checked
                          ? "bg-indigo-600 dark:bg-indigo-500"
                          : "bg-gray-300 dark:bg-slate-600"
                      }`}
                    >
                      <span
                        className={`absolute h-5 w-5 left-0.5 bottom-0.5 bg-white dark:bg-white rounded-full transition-all duration-200 ${
                          checked ? "transform translate-x-6" : ""
                        }`}
                      ></span>
                    </label>
                  </div>
                </div>
              )}

              {/* Cart Menu */}
              <CartMenu checked={checked} billId={bill.id} />

              {/* Enhanced Payment Form */}
              {checked && !billData.bill.isPaid && remainingAmount > 0 && (
                <div className="space-y-6 mt-2">
                  <div className="bg-white dark:bg-slate-700 p-5 rounded-xl border border-gray-100 dark:border-slate-600 shadow-sm">
                    <label
                      htmlFor="amountInput"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3"
                    >
                      ¿Cuánto desea pagar?
                    </label>

                    {/* Enhanced Amount Input */}
                    <div className="relative mb-4">
                      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                        <DollarSign className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      </div>
                      <input
                        ref={inputRef}
                        type="text"
                        inputMode="decimal"
                        className={cn(
                          "w-full p-4 pl-12 pr-4 text-xl font-semibold bg-white dark:bg-slate-800 border-2 rounded-xl transition-all duration-200 text-gray-900 dark:text-white",
                          isInputFocused
                            ? "border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/20 dark:ring-indigo-400/20"
                            : error
                            ? "border-red-500 dark:border-red-400"
                            : "border-gray-200 dark:border-slate-600",
                          "focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-400/20"
                        )}
                        id="amountInput"
                        value={rawInputValue}
                        onChange={handleInputAmountChange}
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                        disabled={isLoading}
                        placeholder="0,00"
                        autoComplete="off"
                      />

                      {/* Input Status Indicator */}
                      {rawInputValue && !error && (
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        </div>
                      )}
                    </div>

                    {/* Max amount indicator */}
                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                      <span>Saldo disponible:</span>
                      <span className="font-medium">
                        ${remainingAmount.toFixed(2)}
                      </span>
                    </div>

                    {/* Error Display */}
                    {error && (
                      <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="flex items-start text-red-600 dark:text-red-400 text-sm">
                          <svg
                            className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span>{error}</span>
                        </div>
                      </div>
                    )}

                    {/* Quick Amount Buttons */}
                    {remainingAmount > 0 && (
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { factor: 0.25, label: "25%" },
                          { factor: 0.5, label: "50%" },
                          { factor: 1, label: "Total" },
                        ].map(({ factor, label }) => (
                          <button
                            key={factor}
                            type="button"
                            onClick={() => handleQuickAmount(factor)}
                            disabled={isLoading}
                            className="py-3 px-4 bg-indigo-50 dark:bg-slate-600 text-indigo-600 dark:text-indigo-200 rounded-xl text-sm font-medium hover:bg-indigo-100 dark:hover:bg-slate-500 transition-all duration-200 disabled:opacity-50 hover:scale-105 active:scale-95"
                          >
                            <div className="text-xs opacity-75 mb-1">
                              {label}
                            </div>
                            <div className="font-semibold">
                              ${(remainingAmount * factor).toFixed(2)}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* MercadoPago Form */}
                  {Number.parseFloat(clientPaymentAmount) > 0 && !error && (
                    <div className="bg-white dark:bg-slate-700 p-5 rounded-xl border border-gray-100 dark:border-slate-600 shadow-sm">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-4 flex items-center">
                        <CreditCard className="h-4 w-4 mr-2 text-indigo-500 dark:text-indigo-400" />
                        Detalles del pago con tarjeta
                      </h3>

                      <form id="form-checkout" className="space-y-4">
                        <div className="space-y-3">
                          <div className="relative input-container">
                            <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 z-10" />
                            <div
                              id="form-checkout__cardNumber"
                              className="w-full h-10 pl-10 bg-transparent relative z-0 mercadopago-form-control"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="relative input-container">
                              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 z-10" />
                              <div
                                id="form-checkout__expirationDate"
                                className="w-full h-10 pl-10 bg-transparent relative z-0 mercadopago-form-control"
                              />
                            </div>
                            <div className="relative input-container">
                              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 z-10" />
                              <div
                                id="form-checkout__securityCode"
                                className="w-full h-10 pl-10 bg-transparent relative z-0 mercadopago-form-control"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="relative input-container">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 z-10" />
                          <input
                            type="text"
                            id="form-checkout__cardholderName"
                            className="w-full p-3 pl-10 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 text-gray-900 dark:text-white h-10 mercadopago-form-control-input"
                            disabled={isLoading}
                          />
                        </div>
                        <div className="relative input-container">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 z-10" />
                          <input
                            type="email"
                            id="form-checkout__cardholderEmail"
                            className="w-full p-3 pl-10 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 text-gray-900 dark:text-white h-10 mercadopago-form-control-input"
                            disabled={isLoading}
                          />
                        </div>
                        <select
                          id="form-checkout__issuer"
                          className="w-full p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white h-10 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 mercadopago-form-control-input"
                          disabled={isLoading}
                        ></select>
                        <select
                          id="form-checkout__installments"
                          className="w-full p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white h-10 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 mercadopago-form-control-input"
                          disabled={isLoading}
                        ></select>
                        <select
                          id="form-checkout__identificationType"
                          className="w-full p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white h-10 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 mercadopago-form-control-input"
                          disabled={isLoading}
                        ></select>
                        <input
                          type="text"
                          id="form-checkout__identificationNumber"
                          className="w-full p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 text-gray-900 dark:text-white h-10 mercadopago-form-control-input"
                          disabled={isLoading}
                        />
                        <progress
                          value="0"
                          className="progress-bar w-full h-1 bg-gray-200 rounded overflow-hidden hidden"
                        >
                          Cargando...
                        </progress>
                        <button
                          type="submit"
                          id="form-checkout__submit"
                          className={cn(
                            "w-full p-4 text-white font-semibold rounded-xl flex items-center justify-center transition-all duration-300 text-lg",
                            isLoading ||
                              !!error ||
                              Number.parseFloat(clientPaymentAmount) <= 0
                              ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed"
                              : "bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-500 dark:to-purple-500 hover:from-indigo-700 hover:to-purple-700 dark:hover:from-indigo-600 dark:hover:to-purple-600 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
                          )}
                          disabled={
                            isLoading ||
                            !!error ||
                            Number.parseFloat(clientPaymentAmount) <= 0
                          }
                        >
                          {isLoading ? (
                            <>
                              <svg
                                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              Procesando pago...
                            </>
                          ) : (
                            <>
                              Pagar $
                              {Number.parseFloat(clientPaymentAmount).toFixed(
                                2
                              )}
                              <ArrowRight className="ml-2 h-5 w-5" />
                            </>
                          )}
                        </button>
                      </form>
                      <div className="mt-4 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
                        <Lock className="h-3 w-3 mr-1" />
                        <span>Pago seguro procesado por MercadoPago</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Payment Success Message */}
              {billData.bill.isPaid && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800 flex items-center">
                  <div className="bg-emerald-100 dark:bg-emerald-800/50 rounded-full p-2 mr-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-emerald-800 dark:text-emerald-300">
                      Pago completo
                    </h4>
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">
                      Su factura ha sido pagada en su totalidad. ¡Gracias!
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : isLoading ? (
            <div className="flex justify-center items-center p-10">
              <svg
                className="animate-spin h-8 w-8 text-indigo-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <p className="ml-3 text-gray-700 dark:text-gray-300">
                Cargando factura...
              </p>
            </div>
          ) : (
            error &&
            !billData?.bill && (
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-800 flex items-center">
                <div className="bg-red-100 dark:bg-red-800/50 rounded-full p-2 mr-3">
                  <svg
                    className="w-5 h-5 text-red-500 dark:text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-red-800 dark:text-red-300">
                    Error al cargar la factura
                  </h4>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                </div>
              </div>
            )
          )}
        </CardContent>
      </Card>
      <style jsx global>{`
        .mercadopago-form-control {
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          padding: 0.75rem 0.75rem 0.75rem 2.5rem;
          height: 2.5rem;
          box-sizing: border-box;
          background-color: white;
        }
        .dark .mercadopago-form-control {
          border-color: #4b5563;
          background-color: #1f2937;
        }
        .mercadopago-form-control iframe {
          display: block !important;
        }
        .input-container {
          position: relative;
        }
        .input-container .lucide-icon {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
          z-index: 10;
        }
        .dark .input-container .lucide-icon {
          color: #6b7280;
        }
      `}</style>
    </div>
  );
};

export default MercadoPagoCheckout;
