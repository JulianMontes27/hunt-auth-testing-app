import { NextApiRequest } from "next";
import { db } from "@/db";
import {} from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import axios, { AxiosError } from "axios";
import { v4 as uuidv4 } from "uuid";
import MercadoPagoConfig, { Payment } from "mercadopago";
import { NextResponse } from "next/server";

interface PaymentRequestBody {
  // SECURITY: Add access token to payment requests
  // access_token: string;
  token: string;
  issuer_id: string;
  payment_method_id: string;
  transaction_amount: string;
  installments: number;
  payer: {
    email: string;
    identification: {
      type: string;
      number: string;
    };
  };
  // description?: string;
  // bill_id: string;
}
// Route Handler for Sending Payments to Mercadopago
export default async function POST(req: NextApiRequest) {
  if (req.method !== "POST") {
    return NextResponse.json(
      { error: "Método no permitido." },
      { status: 405 }
    );
  }

  try {
    // Parse and validate request body
    const body = req.body as PaymentRequestBody;
    const {
      // access_token, // SECURITY: Now required
      token,
      issuer_id,
      payment_method_id,
      transaction_amount,
      installments,
      payer,
    } = body;

    // SECURITY: Validate access token FIRST
    // if (!access_token) {
    //   return res.status(401).json({
    //     error: "Access token required.",
    //     field: "access_token",
    //   });
    // }
    // const accessValidation = await validateTableAccess(tableId, access_token);
    // if (!accessValidation.valid) {
    //   return res.status(403).json({
    //     error: "Invalid or expired access token.",
    //     reason: accessValidation.reason,
    //   });
    // }

    // Validate other required fields
    const requiredFields = {
      token: "TOKEN",
      issuer_id: "ISSUER_ID",
      payment_method_id: "PAYMENT_METHOD_ID",
      transaction_amount: "TRANSACTION_AMOUNT",
      installments: "INSTALLMENTS",
      payer: "PAYER",
      bill_id: "BILL_ID",
    };

    // Check if a given Field is missing from the Request Body
    for (const [field, fieldName] of Object.entries(requiredFields)) {
      if (!body[field as keyof PaymentRequestBody]) {
        return NextResponse.json(
          {
            error: `No ${fieldName} provided.`,
            field: field,
          },
          {
            status: 400,
          }
        );
      }
    }

    // Validate transaction_amount
    if (Number.parseFloat(transaction_amount) <= 0) {
      return NextResponse.json(
        {
          error: "Invalid amount.",
          field: "amount",
        },
        {
          status: 400,
        }
      );
    }

    // Get restaurant owner

    if (!owner?.marketplace) {
      return res.status(400).json({
        error: "Restaurant not configured for payments.",
        details: "Missing marketplace access token",
      });
    }

    // Calculate application fee (0.5% as per your code)
    const application_fee = Number((transaction_amount * 0.005).toFixed(2));

    // Create payment data
    const payment_data = {
      transaction_amount,
      token,
      installments,
      payment_method_id,
      issuer_id: Number(issuer_id),
      payer: {
        email: payer.email,
        identification: {
          type: payer.identification.type,
          number: payer.identification.number,
        },
      },
      application_fee,
      // statement_descriptor: table.restaurant.name,
    };

    // Process payment with MercadoPago
    const client: MercadoPagoConfig = new MercadoPagoConfig({
      accessToken: owner.marketplace,
    });

    const payment = await new Payment(client).create({
      body: payment_data,
      requestOptions: { idempotencyKey: uuidv4() },
    });

    // Process successful payment
    if (payment.status === "approved") {
      let billFullyPaid = false;

      if (Number(bill.totalAmount) === payment.net_amount) {
        // Full payment - mark bill as completed
        await db
          .update(bills)
          .set({
            isPaid: true,
            paidAmount: String(payment.net_amount),
            updatedAt: new Date(),
          })
          .where(eq(bills.id, bill.id));

        billFullyPaid = true;

        // Create payment record
        await db.insert(payments).values({
          billId: bill.id,
          paidAmount: bill.totalAmount,
          paymentId: payment.id?.toString()!,
          dateApproved: payment.date_approved
            ? new Date(payment.date_approved)
            : null,
        });
      } else {
        // Partial payment - create bill share
        await db
          .update(bills)
          .set({
            paidAmount: sql`${bills.paidAmount} + ${payment.net_amount}`,
            updatedAt: new Date(),
          })
          .where(and(eq(bills.id, bill.id), eq(bills.isPaid, false)));

        await db.insert(billShares).values({
          guestId: payer.email,
          billId: bill.id,
          amountPaid: String(payment.net_amount),
          paid: true,
        });
      }

      // SECURITY: If bill is fully paid, regenerate table access token
      let newTableData = null;
      if (billFullyPaid) {
        try {
          newTableData = await regenerateTableTokenAfterPayment(tableId);
          console.log(
            `[SECURITY] Table ${tableId} token regenerated after bill completion`
          );
        } catch (tokenError) {
          console.error(
            `[SECURITY] Failed to regenerate token for table ${tableId}:`,
            tokenError
          );
          // Don't fail the payment, but log for manual intervention
        }
      }

      // Emit socket event
      if (res.socket?.server?.io) {
        res.socket.server.io.emit(`table:${tableId}:pagos`, {
          status: "success",
          amount: transaction_amount,
          billId: bill_id,
          billFullyPaid,
          // Include new QR code if token was regenerated
          ...(newTableData && {
            newQRCode: newTableData.qrCodeImageDataUrl,
            message: "New QR code generated for next service",
          }),
        });
      }

      return res.status(200).json({
        message: "Payment processed successfully",
        billFullyPaid,
        ...(newTableData && {
          newQRGenerated: true,
          message: "Table ready for next service with new QR code",
        }),
      });
    }

    // Payment not approved
    return res.status(400).json({
      error: "Payment not approved",
      status: payment.status,
      details: payment.status_detail,
    });
  } catch (error) {
    console.error("[PAGOS_POST]", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      return res.status(axiosError.response?.status || 500).json({
        error: "Payment processing failed",
        details: axiosError.response?.data || axiosError.message,
      });
    }

    return res.status(500).json({
      error: "Internal server error",
      details: (error as Error).message,
    });
  }
}
