package de.moni.grundschule;

import android.content.Context;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintDocumentInfo;
import android.print.PrintManager;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "MONiPrint")
public final class MONiPrintPlugin extends Plugin {
    private final ExecutorService downloads = Executors.newSingleThreadExecutor();

    @PluginMethod
    public void printPdf(PluginCall call) {
        String urlText = call.getString("url");
        String title = call.getString("title", "MO-Ni-Aufgabenblatt");
        if (urlText == null || !(urlText.startsWith("https://") || urlText.startsWith("http://"))) {
            call.reject("Die PDF-Adresse ist ungültig.");
            return;
        }

        downloads.execute(() -> {
            File pdf = new File(getContext().getCacheDir(), "moni-print-" + System.nanoTime() + ".pdf");
            try {
                HttpURLConnection connection = (HttpURLConnection) new URL(urlText).openConnection();
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(45000);
                connection.setRequestProperty("Accept", "application/pdf");
                connection.connect();
                if (connection.getResponseCode() < 200 || connection.getResponseCode() >= 300) {
                    throw new IllegalStateException("HTTP " + connection.getResponseCode());
                }
                try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(pdf)) {
                    copy(input, output);
                } finally {
                    connection.disconnect();
                }

                getActivity().runOnUiThread(() -> {
                    PrintManager manager = (PrintManager) getContext().getSystemService(Context.PRINT_SERVICE);
                    if (manager == null) {
                        pdf.delete();
                        call.reject("Auf diesem Gerät ist kein Druckdienst verfügbar.");
                        return;
                    }
                    manager.print(title, new PdfAdapter(pdf, title), null);
                    call.resolve();
                });
            } catch (Exception error) {
                pdf.delete();
                call.reject("Das Aufgabenblatt konnte nicht für den Druck vorbereitet werden.", error);
            }
        });
    }

    @Override
    protected void handleOnDestroy() {
        downloads.shutdownNow();
        super.handleOnDestroy();
    }

    private static final class PdfAdapter extends PrintDocumentAdapter {
        private final File pdf;
        private final String title;

        private PdfAdapter(File pdf, String title) {
            this.pdf = pdf;
            this.title = title;
        }

        @Override
        public void onLayout(PrintAttributes oldAttributes, PrintAttributes newAttributes,
                             CancellationSignal cancellationSignal, LayoutResultCallback callback,
                             android.os.Bundle extras) {
            if (cancellationSignal.isCanceled()) {
                callback.onLayoutCancelled();
                return;
            }
            PrintDocumentInfo info = new PrintDocumentInfo.Builder(title + ".pdf")
                .setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT)
                .setPageCount(PrintDocumentInfo.PAGE_COUNT_UNKNOWN)
                .build();
            callback.onLayoutFinished(info, !newAttributes.equals(oldAttributes));
        }

        @Override
        public void onWrite(android.print.PageRange[] pages, ParcelFileDescriptor destination,
                            CancellationSignal cancellationSignal, WriteResultCallback callback) {
            try (FileInputStream input = new FileInputStream(pdf);
                 FileOutputStream output = new FileOutputStream(destination.getFileDescriptor())) {
                copy(input, output);
                if (cancellationSignal.isCanceled()) callback.onWriteCancelled();
                else callback.onWriteFinished(new android.print.PageRange[] { android.print.PageRange.ALL_PAGES });
            } catch (Exception error) {
                callback.onWriteFailed(error.getMessage());
            }
        }

        @Override
        public void onFinish() {
            pdf.delete();
        }
    }

    private static void copy(InputStream input, FileOutputStream output) throws java.io.IOException {
        byte[] buffer = new byte[16 * 1024];
        int read;
        while ((read = input.read(buffer)) != -1) output.write(buffer, 0, read);
        output.flush();
    }
}
