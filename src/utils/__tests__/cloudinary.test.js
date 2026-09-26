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
 *
 * Prompt 39 added the responsive builders — `parseCloudinary`, `buildSrcSet`,
 * `blurThumb` — and they are the part worth asserting hardest, because every
 * image on the site now goes through them and a wrong answer for a
 * `picsum.photos` URL would be a broken `srcset` on every card.
 */

import cloudinary, {
  NETWORK_MESSAGE,
  NOT_CONFIGURED_MESSAGE,
  SRCSET_WIDTHS,
  TEST_UPLOAD_FOLDER,
  UPLOAD_FAILURES,
  describeUploadFailure,
  testCloudinaryUpload,
  blurThumb,
  buildSrcSet,
  buildTransformation,
  cloudinaryConfig,
  cloudinaryUrl,
  isCloudinaryConfigured,
  parseCloudinary,
  parseRatio,
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

  it('chains behind an existing transformation when asked to merge (§7)', () => {
    const cropped = `${CLOUD}/c_crop,x_375,y_655,w_395,h_390/v1789465791/sna-icon.png`;

    // The crop stays first — it narrows the source — and the resize acts on
    // what the crop produced. One `/upload/`, two components.
    expect(cloudinaryUrl(cropped, { w: 640, merge: true })).toBe(
      `${CLOUD}/c_crop,x_375,y_655,w_395,h_390/f_auto,q_auto,w_640/v1789465791/sna-icon.png`
    );
    expect(cloudinaryUrl(cropped, { w: 640, merge: true }).match(/\/upload\//g)).toHaveLength(1);
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

describe('testCloudinaryUpload (prompt 51)', () => {
  const original = global.XMLHttpRequest;

  beforeEach(() => {
    request = null;
    global.XMLHttpRequest = FakeXhr;
    // jsdom draws nothing: the one-pixel picture comes from its bytes.
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  afterEach(() => {
    global.XMLHttpRequest = original;
    jest.restoreAllMocks();
  });

  /** Waits for the request the upload opens once its picture is ready. */
  const opened = async () => {
    for (let attempt = 0; attempt < 20 && !request; attempt += 1) {
      await Promise.resolve();
    }
    return request;
  };

  it('sends a one-pixel PNG with the values given, to the diagnostics folder', async () => {
    const promise = testCloudinaryUpload({
      cloudName: ' typed-cloud ',
      uploadPreset: 'typed-preset',
    });
    const sent = await opened();

    expect(sent.url).toBe('https://api.cloudinary.com/v1_1/typed-cloud/image/upload');
    expect(sent.body.get('upload_preset')).toBe('typed-preset');
    expect(sent.body.get('folder')).toBe(TEST_UPLOAD_FOLDER);
    expect(TEST_UPLOAD_FOLDER).toBe('sna/_diagnostics');
    const picture = sent.body.get('file');
    expect(picture.type).toBe('image/png');
    expect(picture.size).toBeGreaterThan(0);

    sent.respond(200, { secure_url: `${CLOUD}/v1/sna/_diagnostics/pixel.png` });
    await expect(promise).resolves.toMatchObject({ url: `${CLOUD}/v1/sna/_diagnostics/pixel.png` });
  });

  it('keeps the status of a refusal, so an unknown cloud reads as one', async () => {
    const promise = testCloudinaryUpload({ cloudName: 'nope', uploadPreset: 'sna-unsigned' });
    (await opened()).respond(401, { error: { message: 'Invalid cloud_name nope' } });

    const thrown = await promise.catch((error) => error);
    expect(thrown.status).toBe(401);
    expect(describeUploadFailure(thrown)).toBe(UPLOAD_FAILURES.cloudName);
  });
});

describe('describeUploadFailure (prompt 51)', () => {
  it('names a missing or signed preset', () => {
    expect(describeUploadFailure(new Error('Upload preset not found'))).toBe(
      UPLOAD_FAILURES.preset
    );
    expect(
      describeUploadFailure(new Error('Upload preset must be whitelisted for unsigned uploads'))
    ).toBe(UPLOAD_FAILURES.preset);
    expect(UPLOAD_FAILURES.preset).toMatch(/not unsigned — open the walkthrough above/);
  });

  it('tells an unknown cloud from a preset problem', () => {
    expect(describeUploadFailure(new Error('Invalid cloud_name demo-x'))).toBe(
      UPLOAD_FAILURES.cloudName
    );
    expect(UPLOAD_FAILURES.cloudName).not.toBe(UPLOAD_FAILURES.preset);
  });

  it('says the network, and passes anything else on in Cloudinary’s words', () => {
    expect(describeUploadFailure(new Error(NETWORK_MESSAGE))).toBe(UPLOAD_FAILURES.network);
    expect(describeUploadFailure(new Error('File size too large'))).toBe(
      'Cloudinary refused the test upload: File size too large.'
    );
  });
});

it('exports the same helpers on the default object', () => {
  expect(cloudinary.cloudinaryUrl).toBe(cloudinaryUrl);
  expect(cloudinary.isCloudinaryConfigured).toBe(isCloudinaryConfigured);
  expect(cloudinary.uploadToCloudinary).toBe(uploadToCloudinary);
});

describe('parseCloudinary', () => {
  it('takes a delivery URL apart', () => {
    expect(parseCloudinary(`${CLOUD}/v1789465788/sna-logo_o09ugt.png`)).toEqual({
      cloudName: 'demo',
      resourceType: 'image',
      deliveryType: 'upload',
      transformation: '',
      version: 'v1789465788',
      publicId: 'sna-logo_o09ugt',
      format: 'png',
    });
  });

  it('keeps the folders of a public id and reads the transformation back', () => {
    expect(parseCloudinary(`${CLOUD}/w_320,c_fill/sna/properties/lakeview.jpg`)).toMatchObject({
      transformation: 'w_320,c_fill',
      version: null,
      publicId: 'sna/properties/lakeview',
      format: 'jpg',
    });
  });

  it('reads the short form that names no resource type', () => {
    expect(parseCloudinary('https://res.cloudinary.com/demo/upload/v1/sample.jpg')).toMatchObject({
      cloudName: 'demo',
      resourceType: null,
      publicId: 'sample',
    });
  });

  it('is `null` for every URL that is somebody else’s', () => {
    [
      'https://picsum.photos/seed/whitefield/1200/800',
      'https://api.cloudinary.com/v1_1/demo/auto/upload',
      'https://res.cloudinary.com/demo/image/upload/',
      '/brand/logo.png',
      '',
      null,
      undefined,
      42,
    ].forEach((url) => expect(parseCloudinary(url)).toBeNull());
  });
});

describe('parseRatio', () => {
  it('reads every shape a `ratio` prop is written in', () => {
    expect(parseRatio('16/9')).toBeCloseTo(16 / 9);
    expect(parseRatio('4 / 3')).toBeCloseTo(4 / 3);
    expect(parseRatio('1')).toBe(1);
    expect(parseRatio(1.91)).toBe(1.91);
  });

  it('is `null` for anything that is not a ratio', () => {
    ['', 'auto', '0/3', '4/0', '-1', null, undefined, {}].forEach((value) =>
      expect(parseRatio(value)).toBeNull()
    );
  });
});

describe('buildSrcSet', () => {
  const url = `${CLOUD}/v1/lakeview.jpg`;

  it('offers the six widths of §8.6, each with `f_auto,q_auto,dpr_auto`', () => {
    const set = buildSrcSet(url);

    expect(SRCSET_WIDTHS).toEqual([320, 480, 640, 960, 1280, 1600]);
    expect(set.split(', ')).toHaveLength(6);
    expect(set.split(', ')[0]).toBe(`${CLOUD}/f_auto,q_auto,w_320,dpr_auto/v1/lakeview.jpg 320w`);
    expect(set).toContain(`${CLOUD}/f_auto,q_auto,w_1600,dpr_auto/v1/lakeview.jpg 1600w`);
  });

  it('adds the height and `c_fill` when the box has a ratio', () => {
    const set = buildSrcSet(url, [320, 640], { ratio: '16/9' });

    expect(set).toBe(
      [
        `${CLOUD}/f_auto,q_auto,w_320,h_180,c_fill,dpr_auto/v1/lakeview.jpg 320w`,
        `${CLOUD}/f_auto,q_auto,w_640,h_360,c_fill,dpr_auto/v1/lakeview.jpg 640w`,
      ].join(', ')
    );
  });

  it('takes the crop mode it is given', () => {
    expect(buildSrcSet(url, [320], { ratio: '1', crop: 'pad' })).toContain('c_pad');
  });

  it('sorts, de-duplicates and drops widths that are not widths', () => {
    expect(buildSrcSet(url, [640, 320, 640, 0, -5, NaN, 'wide'])).toBe(
      [
        `${CLOUD}/f_auto,q_auto,w_320,dpr_auto/v1/lakeview.jpg 320w`,
        `${CLOUD}/f_auto,q_auto,w_640,dpr_auto/v1/lakeview.jpg 640w`,
      ].join(', ')
    );
  });

  it('merges rather than doubling `/upload/` on a URL that is already cropped (§7)', () => {
    const cropped = `${CLOUD}/c_crop,x_375,y_655,w_395,h_390/v1789465791/sna-icon.png`;
    const set = buildSrcSet(cropped, [320]);

    expect(set).toBe(
      `${CLOUD}/c_crop,x_375,y_655,w_395,h_390/f_auto,q_auto,w_320,dpr_auto/v1789465791/sna-icon.png 320w`
    );
    expect(set.match(/\/upload\//g)).toHaveLength(1);
  });

  it('is `null` when there is nothing to offer', () => {
    expect(buildSrcSet('https://picsum.photos/seed/whitefield/1200/800')).toBeNull();
    expect(buildSrcSet('/brand/logo.png')).toBeNull();
    expect(buildSrcSet(url, [])).toBeNull();
    expect(buildSrcSet(null)).toBeNull();
  });
});

describe('blurThumb', () => {
  it('is a 24-pixel blur of the same picture', () => {
    expect(blurThumb(`${CLOUD}/v1/lakeview.jpg`)).toBe(
      `${CLOUD}/f_auto,q_1,w_24,e_blur:200/v1/lakeview.jpg`
    );
  });

  it('chains behind an existing transformation', () => {
    const cropped = `${CLOUD}/c_crop,w_395,h_390/v1/sna-icon.png`;
    expect(blurThumb(cropped)).toBe(
      `${CLOUD}/c_crop,w_395,h_390/f_auto,q_1,w_24,e_blur:200/v1/sna-icon.png`
    );
  });

  it('is `null` for a picture we cannot transform', () => {
    expect(blurThumb('https://picsum.photos/seed/whitefield/1200/800')).toBeNull();
    expect(blurThumb('')).toBeNull();
  });
});

describe('the default export', () => {
  it('carries the responsive builders too', () => {
    expect(cloudinary.buildSrcSet).toBe(buildSrcSet);
    expect(cloudinary.blurThumb).toBe(blurThumb);
    expect(cloudinary.parseCloudinary).toBe(parseCloudinary);
  });
});
