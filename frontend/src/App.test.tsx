import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import * as qr from './lib/qr';

vi.mock('./lib/qr', async (orig) => ({
  ...(await orig<typeof import('./lib/qr')>()),
  renderQR: vi.fn().mockResolvedValue(undefined),
  canvasToBlob: vi.fn().mockResolvedValue(new Blob(['png'], { type: 'image/png' })),
}));

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0]);
const png = () => new File([PNG], 'logo.png', { type: 'image/png' });

class FakeImage {
  width = 100;
  height = 50;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_v: string) {
    queueMicrotask(() => this.onload?.());
  }
}

const textbox = () => screen.getByLabelText(/text to encode|web address/i);
const generateBtn = () => screen.getByRole('button', { name: /generate qr code/i });
const upload = (f: File) => fireEvent.change(screen.getByLabelText('Logo (optional)', { selector: 'input' }), { target: { files: [f] } });

let revoke: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.stubGlobal('Image', FakeImage);
  revoke = vi.fn();
  Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:logo'), revokeObjectURL: revoke });
  vi.mocked(qr.renderQR).mockClear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('renders the main interface', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'QR Code Generator' })).toBeInTheDocument();
    expect(screen.getByText(/your qr code appears here/i)).toBeInTheDocument();
    expect(generateBtn()).toBeDisabled();
  });

  it('switches between text and URL mode', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('radio', { name: 'URL' }));
    expect(screen.getByRole('radio', { name: 'URL' })).toBeChecked();
    expect(textbox()).toHaveAttribute('placeholder', expect.stringContaining('https://'));
    fireEvent.click(screen.getByRole('radio', { name: 'Text' }));
    expect(screen.getByRole('radio', { name: 'Text' })).toBeChecked();
  });

  it('keeps Generate disabled for empty or whitespace input', () => {
    render(<App />);
    fireEvent.change(textbox(), { target: { value: '   ' } });
    expect(generateBtn()).toBeDisabled();
  });

  it('generates a QR code from text', async () => {
    render(<App />);
    fireEvent.change(textbox(), { target: { value: 'hello' } });
    fireEvent.click(generateBtn());
    await screen.findByRole('button', { name: /download png/i });
    expect(qr.renderQR).toHaveBeenCalledWith(expect.anything(), 'hello', expect.objectContaining({ ecl: 'M', size: 1024 }), undefined);
  });

  it('generates from a URL without altering it', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('radio', { name: 'URL' }));
    const url = 'https://chat.whatsapp.com/AbC?x=1#top';
    fireEvent.change(textbox(), { target: { value: url } });
    fireEvent.click(generateBtn());
    await screen.findByRole('button', { name: /download png/i });
    expect(vi.mocked(qr.renderQR).mock.calls[0][1]).toBe(url);
  });

  it('shows an accessible error for an invalid URL', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('radio', { name: 'URL' }));
    fireEvent.change(textbox(), { target: { value: 'not a url' } });
    expect(screen.getByRole('alert')).toHaveTextContent(/full URL/i);
    expect(textbox()).toHaveAttribute('aria-invalid', 'true');
    expect(generateBtn()).toBeDisabled();
  });

  it('rejects images larger than 1 MiB', async () => {
    render(<App />);
    upload(new File([new Uint8Array(1_048_577)], 'big.png', { type: 'image/png' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/1 MiB/);
  });

  it('rejects unsupported formats', async () => {
    render(<App />);
    upload(new File(['GIF89a......'], 'a.gif', { type: 'image/gif' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/PNG, JPEG or WebP/);
  });

  it('accepts a valid image, uses it, and removes it with cleanup', async () => {
    render(<App />);
    upload(png());
    await screen.findByAltText('Selected logo preview');
    fireEvent.change(textbox(), { target: { value: 'logo test' } });
    fireEvent.click(generateBtn());
    await screen.findByRole('button', { name: /download png/i });
    expect(vi.mocked(qr.renderQR).mock.calls[0][3]).toBeInstanceOf(FakeImage);
    expect(vi.mocked(qr.renderQR).mock.calls[0][2].ecl).toBe('H');
    fireEvent.click(screen.getByRole('button', { name: 'Remove image' }));
    expect(screen.queryByAltText('Selected logo preview')).not.toBeInTheDocument();
    expect(revoke).toHaveBeenCalledWith('blob:logo');
  });

  it('applies custom colors to the QR settings', async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Foreground color'), { target: { value: '#647c64' } });
    fireEvent.change(screen.getByLabelText('Background color'), { target: { value: '#faf9f6' } });
    fireEvent.change(textbox(), { target: { value: 'colors' } });
    fireEvent.click(generateBtn());
    await screen.findByRole('button', { name: /download png/i });
    expect(vi.mocked(qr.renderQR).mock.calls[0][2]).toEqual(expect.objectContaining({ fg: '#647c64', bg: '#faf9f6' }));
  });

  it('blocks identical foreground and background colors', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Foreground color'), { target: { value: '#ffffff' } });
    fireEvent.change(textbox(), { target: { value: 'x' } });
    expect(screen.getByRole('alert')).toHaveTextContent(/same color/i);
    expect(generateBtn()).toBeDisabled();
  });

  it('marks the preview stale when input changes', async () => {
    render(<App />);
    fireEvent.change(textbox(), { target: { value: 'one' } });
    fireEvent.click(generateBtn());
    await screen.findByRole('button', { name: /download png/i });
    fireEvent.change(textbox(), { target: { value: 'two' } });
    expect(screen.getByRole('button', { name: /download png/i })).toBeDisabled();
    expect(screen.getByText(/settings changed/i)).toBeInTheDocument();
  });

  it('shows a visible error when generation fails', async () => {
    vi.mocked(qr.renderQR).mockRejectedValueOnce(new Error('The amount of data is too big'));
    render(<App />);
    fireEvent.change(textbox(), { target: { value: 'x' } });
    fireEvent.click(generateBtn());
    expect(await screen.findByRole('alert')).toHaveTextContent(/too long/i);
  });

  it('wires the download button to a sanitized PNG download', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('My-code.png');
    });
    render(<App />);
    fireEvent.change(textbox(), { target: { value: 'dl' } });
    fireEvent.change(screen.getByLabelText(/file name/i), { target: { value: 'My code!.png' } });
    fireEvent.click(generateBtn());
    fireEvent.click(await screen.findByRole('button', { name: /download png/i }));
    await waitFor(() => expect(click).toHaveBeenCalledOnce());
    expect(qr.canvasToBlob).toHaveBeenCalled();
  });

  it('shows an error when PNG export fails', async () => {
    vi.mocked(qr.canvasToBlob).mockRejectedValueOnce(new Error('x'));
    render(<App />);
    fireEvent.change(textbox(), { target: { value: 'dl' } });
    fireEvent.click(generateBtn());
    fireEvent.click(await screen.findByRole('button', { name: /download png/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/PNG could not be created/i);
  });

  it('reset clears all state', async () => {
    render(<App />);
    upload(png());
    await screen.findByAltText('Selected logo preview');
    fireEvent.change(textbox(), { target: { value: 'bye' } });
    fireEvent.click(generateBtn());
    await screen.findByRole('button', { name: /download png/i });
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(textbox()).toHaveValue('');
    expect(screen.queryByRole('button', { name: /download png/i })).not.toBeInTheDocument();
    expect(screen.queryByAltText('Selected logo preview')).not.toBeInTheDocument();
    expect(screen.getByText(/your qr code appears here/i)).toBeInTheDocument();
  });
});
