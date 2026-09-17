/**
 * `utils/cloudinary.js` (prompt 31, decision D12, §8.6).
 *
 * Three questions are worth asserting: whether this deployment can upload at
 * all (and who wins when the settings and the environment disagree), what a
 * delivery URL looks like after a transformation is asked for, and what the
 * upload does with Cloudinary's four possible answers — accepted, refused,
 * unreachable, cancelled.
 *
 * The upload is driven against a fake `XMLHttpRequest`, because the real one
 * would need a network and jsdom's has no `upload` object to report progress
 * through.
 */

import cloudinary, {
  NETWORK_MESSAGE,
  NOT_CONFIGURED_MESSAGE,
  buildTransformation,
  cloudinaryConfig,
  cloudinaryUrl,
  isCloudinaryConfigured,
  toUploadResult,
  uploadEndpoint,
  uploadToCloudinary,
} from '../cloudinary';

const CLOUD = 'https://res.cloudinary.com/demo/image/upload';

const SETTINGS = {
  integrations: { cloudinaryCloudName: 'from-settings', cloudinaryUploadPreset: 'preset-settings' },
};

describe('cloudinaryConfig / isCloudinaryConfigured', () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it('reads the build-time variables when there are no settings', () => {
    process.env.REACT_APP_CLOUDINARY_CLOUD_NAME = 'from-env';
    process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET = 'preset-env';

    expect(cloudinaryConfig(null)).toEqual({
      cloudName: 'from-env',
      uploadPreset: 'preset-env',
    });
    expect(isCloudinaryConfigured(null)).toBe(true);
  });

  it('lets the settings win over the environment', () => {
    process.env.REACT_APP_CLOUDINARY_CLOUD_NAME = 'from-env';
    process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET = 'preset-env';

    expect(cloudinaryConfig(SETTINGS)).toEqual({
      cloudName: 'from-settings',
      uploadPreset: 'preset-settings',
    });
  });

  it('trims what it is given and ignores the blank half of a pair', () => {
    delete process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
    delete process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

    const settings = {
      integrations: { cloudinaryCloudName: '  spaced  ', cloudinaryUploadPreset: '   ' },
    };

    expect(cloudinaryConfig(settings)).toEqual({ cloudName: 'spaced', uploadPreset: '' });
    // Half a configuration cannot upload, so the form must offer a URL box.
    expect(isCloudinaryConfigured(settings)).toBe(false);
  });

  it('is not configured when nothing is set anywhere', () => {
    delete process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
    delete process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

    expect(isCloudinaryConfigured(null)).toBe(false);
    expect(isCloudinaryConfigured({})).toBe(false);
  });
});

describe('uploadEndpoint', () => {
  it('builds the unsigned upload URL, `auto` by default (D12)', () => {
    expect(uploadEndpoint('demo')).toBe('https://api.cloudinary.com/v1_1/demo/auto/upload');
    expect(uploadEndpoint('demo', 'image')).toBe(
      'https://api.cloudinary.com/v1_1/demo/image/upload'
    );
  });

  it('encodes a cloud name that would otherwise change the path', () => {
    expect(uploadEndpoint('a/b')).toBe('https://api.cloudinary.com/v1_1/a%2Fb/auto/upload');
  });
});

describe('buildTransformation', () => {
  it('writes `f_auto,q_auto,w_…` in the order §8.6 gives', () => {
    expect(buildTransformation({ w: 640 })).toBe('f_auto,q_auto,w_640');
    expect(buildTransformation({ w: 640, h: 480, crop: 'fill' })).toBe(
      'f_auto,q_auto,w_640,h_480,c_fill'
    );
  });

  it('rounds a fractional width and drops what was not asked for', () => {
    expect(buildTransformation({ w: 639.6, quality: null, format: null })).toBe('w_640');
    expect(buildTransformation({ quality: null, format: null })).toBe('');
  });

  it('takes an explicit quality, format and dpr', () => {
    expect(buildTransformation({ w: 320, quality: 80, format: 'webp', dpr: 2 })).toBe(
      'f_webp,q_80,w_320,dpr_2'
    );
  });
});

describe('cloudinaryUrl', () => {
  it('injects the transformation after `/upload/`', () => {
    expect(cloudinaryUrl(`${CLOUD}/v1789465788/sna-logo.png`, { w: 640 })).toBe(
      `${CLOUD}/f_auto,q_auto,w_640/v1789465788/sna-logo.png`
    );
  });

  it('works on a public id with no version and on a nested folder', () => {
    expect(cloudinaryUrl(`${CLOUD}/sample.jpg`, { w: 320 })).toBe(
      `${CLOUD}/f_auto,q_auto,w_320/sample.jpg`
    );
    expect(cloudinaryUrl(`${CLOUD}/my_folder/sample.jpg`, { w: 320 })).toBe(
      `${CLOUD}/f_auto,q_auto,w_320/my_folder/sample.jpg`
    );
  });

  it('leaves a URL that already carries a transformation alone', () => {
    const cropped = `${CLOUD}/w_16,h_16,c_pad,b_white,f_png/v1789465791/sna-icon.png`;
    expect(cloudinaryUrl(cropped, { w: 640 })).toBe(cropped);
  });

  it('returns anything that is not a Cloudinary delivery URL untouched', () => {
    const others = [
      'https://picsum.photos/seed/whitefield/1200/800',
      '/brand/logo.png',
      'https://api.cloudinary.com/v1_1/demo/auto/upload',
      '',
    ];

    others.forEach((url) => expect(cloudinaryUrl(url, { w: 640 })).toBe(url));
    expect(cloudinaryUrl(null, { w: 640 })).toBeNull();
    expect(cloudinaryUrl(undefined)).toBeUndefined();
  });

  it('returns the URL unchanged when nothing was asked for', () => {
    const url = `${CLOUD}/v1/sample.jpg`;
    expect(cloudinaryUrl(url, { quality: null, format: null })).toBe(url);
  });
});

describe('toUploadResult', () => {
  it('prefers the secure URL and normalises the numbers', () => {
    expect(
      toUploadResult({
        secure_url: `${CLOUD}/v1/cv.pdf`,
        url: 'http://res.cloudinary.com/demo/image/upload/v1/cv.pdf',
        public_id: 'resumes/cv',
        bytes: 24_601,
        format: 'pdf',
        resource_type: 'image',
      })
    ).toEqual({
      url: `${CLOUD}/v1/cv.pdf`,
      publicId: 'resumes/cv',
      bytes: 24_601,
      format: 'pdf',
      width: null,
      height: null,
      resourceType: 'image',
    });
  });
});

/* ------------------------------------------------------------------ *
 * The upload
 * ------------------------------------------------------------------ */

/** The one request the fake `XMLHttpRequest` of a test has created. */
let request = null;

class FakeXhr {
  constructor() {
    this.status = 0;
    this.responseText = '';
    this.listeners = {};
    this.upload = {
      listeners: {},
      addEventListener(type, handler) {
        this.listeners[type] = handler;
      },
    };
    request = this;
  }

  addEventListener(type, handler) {
    this.listeners[type] = handler;
  }

  open(method, url) {
    this.method = method;
    this.url = url;
  }

  send(body) {
    this.body = body;
  }

  abort() {
    this.listeners.abort?.();
  }

  /** Cloudinary answering. */
  respond(status, payload) {
    this.status = status;
    this.responseText = typeof payload === 'string' ? payload : JSON.stringify(payload);
    this.listeners.load?.();
  }

  progress(loaded, total) {
    this.upload.listeners.progress?.({ lengthComputable: true, loaded, total });
  }

  fail() {
    this.listeners.error?.();
  }
}

describe('uploadToCloudinary', () => {
  const file = new File(['cv'], 'cv.pdf', { type: 'application/pdf' });
  const original = global.XMLHttpRequest;

  beforeEach(() => {
    request = null;
    global.XMLHttpRequest = FakeXhr;
  });

  afterEach(() => {
    global.XMLHttpRequest = original;
  });

  it('refuses before sending anything when nothing is configured', async () => {
    await expect(uploadToCloudinary(file, { settings: {} })).rejects.toThrow(
      NOT_CONFIGURED_MESSAGE
    );
    expect(request).toBeNull();
  });

  it('posts the file and the preset, and resolves with the stored fields', async () => {
    const onProgress = jest.fn();
    const promise = uploadToCloudinary(file, {
      settings: SETTINGS,
      folder: 'resumes',
      onProgress,
    });

    expect(request.method).toBe('POST');
    expect(request.url).toBe('https://api.cloudinary.com/v1_1/from-settings/auto/upload');
    expect(request.body.get('upload_preset')).toBe('preset-settings');
    expect(request.body.get('folder')).toBe('resumes');
    expect(request.body.get('file')).toBe(file);

    request.progress(30, 120);
    expect(onProgress).toHaveBeenCalledWith(25);

    request.respond(200, {
      secure_url: `${CLOUD}/v1/resumes/cv.pdf`,
      public_id: 'resumes/cv',
      bytes: 2048,
      format: 'pdf',
      resource_type: 'image',
    });

    await expect(promise).resolves.toMatchObject({
      url: `${CLOUD}/v1/resumes/cv.pdf`,
      publicId: 'resumes/cv',
      bytes: 2048,
    });
    expect(onProgress).toHaveBeenLastCalledWith(100);
  });

  it('rejects with Cloudinary’s own message when it refuses the file', async () => {
    const promise = uploadToCloudinary(file, { settings: SETTINGS });
    request.respond(400, { error: { message: 'Upload preset must be whitelisted' } });

    await expect(promise).rejects.toThrow('Upload preset must be whitelisted');
  });

  it('rejects with the network message when the request never arrives', async () => {
    const promise = uploadToCloudinary(file, { settings: SETTINGS });
    request.fail();

    await expect(promise).rejects.toThrow(NETWORK_MESSAGE);
  });

  it('cancels through an AbortSignal and rejects with an AbortError', async () => {
    const controller = new AbortController();
    const promise = uploadToCloudinary(file, { settings: SETTINGS, signal: controller.signal });

    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('never opens a request for a signal that was aborted first', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      uploadToCloudinary(file, { settings: SETTINGS, signal: controller.signal })
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(request).toBeNull();
  });
});

it('exports the same helpers on the default object', () => {
  expect(cloudinary.cloudinaryUrl).toBe(cloudinaryUrl);
  expect(cloudinary.isCloudinaryConfigured).toBe(isCloudinaryConfigured);
  expect(cloudinary.uploadToCloudinary).toBe(uploadToCloudinary);
});
