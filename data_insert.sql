--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

-- Started on 2025-05-12 16:25:55

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 218 (class 1259 OID 16744)
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    action text NOT NULL,
    details text NOT NULL,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.activity_logs OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 16743)
-- Name: activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.activity_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activity_logs_id_seq OWNER TO postgres;

--
-- TOC entry 5047 (class 0 OID 0)
-- Dependencies: 217
-- Name: activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.activity_logs_id_seq OWNED BY public.activity_logs.id;


--
-- TOC entry 220 (class 1259 OID 16754)
-- Name: audio_files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audio_files (
    id integer NOT NULL,
    filename text NOT NULL,
    display_name text NOT NULL,
    file_size integer NOT NULL,
    duration integer NOT NULL,
    sample_rate integer,
    file_type text NOT NULL,
    status text DEFAULT 'unused'::text NOT NULL,
    uploaded_by integer NOT NULL,
    uploaded_at timestamp without time zone DEFAULT now() NOT NULL,
    audio_group_id integer NOT NULL
);


ALTER TABLE public.audio_files OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16753)
-- Name: audio_files_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audio_files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audio_files_id_seq OWNER TO postgres;

--
-- TOC entry 5048 (class 0 OID 0)
-- Dependencies: 219
-- Name: audio_files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audio_files_id_seq OWNED BY public.audio_files.id;


--
-- TOC entry 241 (class 1259 OID 16948)
-- Name: audio_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audio_groups (
    id integer NOT NULL,
    name text NOT NULL,
    frequency integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.audio_groups OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 16947)
-- Name: audio_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audio_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audio_groups_id_seq OWNER TO postgres;

--
-- TOC entry 5049 (class 0 OID 0)
-- Dependencies: 240
-- Name: audio_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audio_groups_id_seq OWNED BY public.audio_groups.id;


--
-- TOC entry 222 (class 1259 OID 16765)
-- Name: broadcast_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.broadcast_assignments (
    id integer NOT NULL,
    supermarket_id integer NOT NULL,
    broadcast_program_id integer NOT NULL,
    playlist_id integer,
    assigned_by integer NOT NULL,
    assigned_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.broadcast_assignments OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16764)
-- Name: broadcast_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.broadcast_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.broadcast_assignments_id_seq OWNER TO postgres;

--
-- TOC entry 5050 (class 0 OID 0)
-- Dependencies: 221
-- Name: broadcast_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.broadcast_assignments_id_seq OWNED BY public.broadcast_assignments.id;


--
-- TOC entry 224 (class 1259 OID 16773)
-- Name: broadcast_programs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.broadcast_programs (
    id integer NOT NULL,
    name text NOT NULL,
    date timestamp without time zone NOT NULL,
    settings json NOT NULL,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.broadcast_programs OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16772)
-- Name: broadcast_programs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.broadcast_programs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.broadcast_programs_id_seq OWNER TO postgres;

--
-- TOC entry 5051 (class 0 OID 0)
-- Dependencies: 223
-- Name: broadcast_programs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.broadcast_programs_id_seq OWNED BY public.broadcast_programs.id;


--
-- TOC entry 226 (class 1259 OID 16783)
-- Name: communes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.communes (
    id integer NOT NULL,
    name text NOT NULL,
    province_id integer NOT NULL
);


ALTER TABLE public.communes OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16782)
-- Name: communes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.communes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.communes_id_seq OWNER TO postgres;

--
-- TOC entry 5052 (class 0 OID 0)
-- Dependencies: 225
-- Name: communes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.communes_id_seq OWNED BY public.communes.id;


--
-- TOC entry 228 (class 1259 OID 16792)
-- Name: playlists; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.playlists (
    id integer NOT NULL,
    broadcast_program_id integer NOT NULL,
    items json NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.playlists OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 16791)
-- Name: playlists_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.playlists_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.playlists_id_seq OWNER TO postgres;

--
-- TOC entry 5053 (class 0 OID 0)
-- Dependencies: 227
-- Name: playlists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.playlists_id_seq OWNED BY public.playlists.id;


--
-- TOC entry 230 (class 1259 OID 16802)
-- Name: provinces; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.provinces (
    id integer NOT NULL,
    name text NOT NULL,
    region_id integer NOT NULL
);


ALTER TABLE public.provinces OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 16801)
-- Name: provinces_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.provinces_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.provinces_id_seq OWNER TO postgres;

--
-- TOC entry 5054 (class 0 OID 0)
-- Dependencies: 229
-- Name: provinces_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.provinces_id_seq OWNED BY public.provinces.id;


--
-- TOC entry 232 (class 1259 OID 16811)
-- Name: regions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.regions (
    id integer NOT NULL,
    name text NOT NULL,
    code text NOT NULL
);


ALTER TABLE public.regions OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 16810)
-- Name: regions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.regions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.regions_id_seq OWNER TO postgres;

--
-- TOC entry 5055 (class 0 OID 0)
-- Dependencies: 231
-- Name: regions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.regions_id_seq OWNED BY public.regions.id;


--
-- TOC entry 237 (class 1259 OID 16911)
-- Name: session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.session (
    sid text NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.session OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 16922)
-- Name: supermarket_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.supermarket_types (
    id integer NOT NULL,
    name text NOT NULL,
    display_name text NOT NULL
);


ALTER TABLE public.supermarket_types OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 16921)
-- Name: supermarket_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.supermarket_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.supermarket_types_id_seq OWNER TO postgres;

--
-- TOC entry 5056 (class 0 OID 0)
-- Dependencies: 238
-- Name: supermarket_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.supermarket_types_id_seq OWNED BY public.supermarket_types.id;


--
-- TOC entry 234 (class 1259 OID 16822)
-- Name: supermarkets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.supermarkets (
    id integer NOT NULL,
    name text NOT NULL,
    address text NOT NULL,
    commune_id integer NOT NULL,
    province_id integer NOT NULL,
    region_id integer NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    current_program text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    supermarket_type_id integer NOT NULL
);


ALTER TABLE public.supermarkets OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 16821)
-- Name: supermarkets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.supermarkets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.supermarkets_id_seq OWNER TO postgres;

--
-- TOC entry 5057 (class 0 OID 0)
-- Dependencies: 233
-- Name: supermarkets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.supermarkets_id_seq OWNED BY public.supermarkets.id;


--
-- TOC entry 236 (class 1259 OID 16833)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    full_name text NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 16832)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 5058 (class 0 OID 0)
-- Dependencies: 235
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 4801 (class 2604 OID 16747)
-- Name: activity_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs ALTER COLUMN id SET DEFAULT nextval('public.activity_logs_id_seq'::regclass);


--
-- TOC entry 4803 (class 2604 OID 16757)
-- Name: audio_files id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audio_files ALTER COLUMN id SET DEFAULT nextval('public.audio_files_id_seq'::regclass);


--
-- TOC entry 4823 (class 2604 OID 16951)
-- Name: audio_groups id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audio_groups ALTER COLUMN id SET DEFAULT nextval('public.audio_groups_id_seq'::regclass);


--
-- TOC entry 4806 (class 2604 OID 16768)
-- Name: broadcast_assignments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcast_assignments ALTER COLUMN id SET DEFAULT nextval('public.broadcast_assignments_id_seq'::regclass);


--
-- TOC entry 4808 (class 2604 OID 16776)
-- Name: broadcast_programs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcast_programs ALTER COLUMN id SET DEFAULT nextval('public.broadcast_programs_id_seq'::regclass);


--
-- TOC entry 4810 (class 2604 OID 16786)
-- Name: communes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.communes ALTER COLUMN id SET DEFAULT nextval('public.communes_id_seq'::regclass);


--
-- TOC entry 4811 (class 2604 OID 16795)
-- Name: playlists id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.playlists ALTER COLUMN id SET DEFAULT nextval('public.playlists_id_seq'::regclass);


--
-- TOC entry 4813 (class 2604 OID 16805)
-- Name: provinces id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.provinces ALTER COLUMN id SET DEFAULT nextval('public.provinces_id_seq'::regclass);


--
-- TOC entry 4814 (class 2604 OID 16814)
-- Name: regions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.regions ALTER COLUMN id SET DEFAULT nextval('public.regions_id_seq'::regclass);


--
-- TOC entry 4822 (class 2604 OID 16925)
-- Name: supermarket_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supermarket_types ALTER COLUMN id SET DEFAULT nextval('public.supermarket_types_id_seq'::regclass);


--
-- TOC entry 4815 (class 2604 OID 16825)
-- Name: supermarkets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supermarkets ALTER COLUMN id SET DEFAULT nextval('public.supermarkets_id_seq'::regclass);


--
-- TOC entry 4818 (class 2604 OID 16836)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 5018 (class 0 OID 16744)
-- Dependencies: 218
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.activity_logs (id, user_id, action, details, "timestamp") VALUES
('1', '1', 'upload_audio', 'Tải lên file âm thanh eyes-270938', '2025-05-12 13:09:47.935554'),
('2', '1', 'upload_audio', 'Tải lên file âm thanh hakee-333940', '2025-05-12 13:09:48.029817'),
('3', '1', 'create_user', 'Tạo tài khoản mới cho Trần Minh Tâm (user001)', '2025-05-12 13:13:02.887814'),
('4', '1', 'upload_audio', 'Tải lên file âm thanh it-was-nighttime-it-was-deja-vu-318561', '2025-05-12 13:16:35.862377'),
('5', '1', 'upload_audio', 'Tải lên file âm thanh let-it-go-12279', '2025-05-12 13:16:35.965614'),
('6', '1', 'upload_audio', 'Tải lên file âm thanh metalic-instrument-328274', '2025-05-12 13:21:54.172593'),
('7', '1', 'upload_audio', 'Tải lên file âm thanh nimbus-120-bpm-dj-333380', '2025-05-12 13:21:54.394973'),
('8', '1', 'upload_audio', 'Tải lên file âm thanh please-calm-my-mind-125566', '2025-05-12 13:22:01.431175'),
('9', '1', 'upload_audio', 'Tải lên file âm thanh please-calm-my-mind-125566', '2025-05-12 13:22:09.32243'),
('10', '1', 'upload_audio', 'Tải lên file âm thanh eyes-270938', '2025-05-12 13:22:18.284428'),
('11', '1', 'upload_audio', 'Tải lên file âm thanh hakee-333940', '2025-05-12 13:22:18.431506'),
('12', '1', 'upload_audio', 'Tải lên file âm thanh it-was-nighttime-it-was-deja-vu-318561', '2025-05-12 13:22:26.989713'),
('13', '1', 'upload_audio', 'Tải lên file âm thanh let-it-go-12279', '2025-05-12 13:22:27.162505'),
('14', '1', 'update_audio_group', 'Thay đổi nhóm của file "eyes-270938" từ "greetings" thành "greetings"', '2025-05-12 13:37:22.07096'),
('15', '1', 'update_audio_group', 'Thay đổi nhóm của file "eyes-270938" từ "music" thành "tips"', '2025-05-12 13:39:55.907667'),
('16', '1', 'create_user', 'Tạo tài khoản mới cho Trần Minh Đăng (mag)', '2025-05-12 13:54:51.473635'),
('17', '1', 'logout', 'Đăng xuất khỏi hệ thống', '2025-05-12 13:54:53.785926'),
('18', '3', 'login', 'Đăng nhập vào hệ thống', '2025-05-12 13:54:58.196843'),
('19', '3', 'change_password', 'Thay đổi mật khẩu cho tài khoản của mình', '2025-05-12 14:02:54.709836'),
('20', '3', 'logout', 'Đăng xuất khỏi hệ thống', '2025-05-12 14:03:00.169949'),
('21', '1', 'login', 'Đăng nhập vào hệ thống', '2025-05-12 14:03:13.183433'),
('22', '1', 'logout', 'Đăng xuất khỏi hệ thống', '2025-05-12 14:03:15.294015'),
('23', '3', 'login', 'Đăng nhập vào hệ thống', '2025-05-12 14:03:22.431485'),
('24', '3', 'logout', 'Đăng xuất khỏi hệ thống', '2025-05-12 14:03:24.271901'),
('25', '2', 'login', 'Đăng nhập vào hệ thống', '2025-05-12 14:03:30.577662'),
('26', '2', 'logout', 'Đăng xuất khỏi hệ thống', '2025-05-12 14:03:38.188883'),
('27', '1', 'login', 'Đăng nhập vào hệ thống', '2025-05-12 14:03:44.894117'),
('28', '1', 'login', 'Đăng nhập vào hệ thống', '2025-05-12 14:48:37.221017'),
('29', '1', 'create_supermarket', 'Tạo mới siêu thị BIG C', '2025-05-12 15:10:36.258438'),
('30', '1', 'update_supermarket', 'Cập nhật thông tin siêu thị BIG C', '2025-05-12 15:13:40.565667'),
('31', '1', 'create_supermarket', 'Tạo mới siêu thị Siêu thị Mẫu Hà Nội (nhập từ file)', '2025-05-12 15:24:07.814466'),
('32', '1', 'create_supermarket', 'Tạo mới siêu thị Siêu thị Mẫu TP.HCM (nhập từ file)', '2025-05-12 15:24:07.819046'),
('33', '1', 'create_supermarket', 'Tạo mới siêu thị Siêu thị Mẫu Đà Nẵng (nhập từ file)', '2025-05-12 15:24:07.822399'),
('34', '1', 'create_supermarket', 'Tạo mới siêu thị Siêu thị Mẫu Hải Phòng (nhập từ file)', '2025-05-12 15:24:07.824651'),
('35', '1', 'create_supermarket', 'Tạo mới siêu thị Siêu thị Mẫu Biên Hòa (nhập từ file)', '2025-05-12 15:24:07.826731'),
('36', '1', 'create_supermarket', 'Tạo mới siêu thị Siêu thị Mẫu Cần Thơ (nhập từ file)', '2025-05-12 15:24:07.828968'),
('37', '1', 'create_supermarket', 'Tạo mới siêu thị Siêu thị Mẫu Quảng Nam (nhập từ file)', '2025-05-12 15:24:07.832225'),
('38', '1', 'create_supermarket', 'Tạo mới siêu thị Siêu thị Mẫu Huế (nhập từ file)', '2025-05-12 15:24:07.834478'),
('39', '1', 'create_supermarket', 'Tạo mới siêu thị Siêu thị Mẫu Bắc Giang (nhập từ file)', '2025-05-12 15:24:07.836633'),
('40', '1', 'create_supermarket', 'Tạo mới siêu thị Siêu thị Mẫu Đồng Nai (nhập từ file)', '2025-05-12 15:24:07.838867'),
('41', '1', 'upload_audio', 'Tải lên file âm thanh nimbus-120-bpm-dj-333380', '2025-05-12 16:10:23.132633');


--
-- TOC entry 5020 (class 0 OID 16754)
-- Dependencies: 220
-- Data for Name: audio_files; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.audio_files (id, filename, display_name, file_size, duration, sample_rate, file_type, status, uploaded_by, uploaded_at, audio_group_id) VALUES
('1', '1747030187800-eyes-270938.mp3', 'eyes-270938', '9821204', '307', '44100', 'audio/mpeg', 'unused', '1', '2025-05-12 13:09:47.933092', '1'),
('2', '1747030187994-hakee-333940.mp3', 'hakee-333940', '4226403', '132', '44100', 'audio/mpeg', 'unused', '1', '2025-05-12 13:09:48.028754', '2'),
('3', '1747030595797-it-was-nighttime-it-was-deja-vu-318561.mp3', 'it-was-nighttime-it-was-deja-vu-318561', '5766144', '180', '48000', 'audio/mpeg', 'unused', '1', '2025-05-12 13:16:35.859472', '2'),
('5', '1747030914130-metalic-instrument-328274.mp3', 'metalic-instrument-328274', '2745600', '86', '48000', 'audio/mpeg', 'unused', '1', '2025-05-12 13:21:54.170502', '3'),
('6', '1747030914253-nimbus-120-bpm-dj-333380.mp3', 'nimbus-120-bpm-dj-333380', '3666432', '115', '48000', 'audio/mpeg', 'unused', '1', '2025-05-12 13:21:54.393309', '3'),
('7', '1747030921349-please-calm-my-mind-125566.mp3', 'please-calm-my-mind-125566', '5609012', '175', '44100', 'audio/mpeg', 'unused', '1', '2025-05-12 13:22:01.425862', '3'),
('8', '1747030929241-please-calm-my-mind-125566.mp3', 'please-calm-my-mind-125566', '5609012', '175', '44100', 'audio/mpeg', 'unused', '1', '2025-05-12 13:22:09.316611', '4'),
('9', '1747030938221-eyes-270938.mp3', 'eyes-270938', '9821204', '307', '44100', 'audio/mpeg', 'unused', '1', '2025-05-12 13:22:18.280348', '4'),
('10', '1747030938345-hakee-333940.mp3', 'hakee-333940', '4226403', '132', '44100', 'audio/mpeg', 'unused', '1', '2025-05-12 13:22:18.425808', '4'),
('11', '1747030946886-it-was-nighttime-it-was-deja-vu-318561.mp3', 'it-was-nighttime-it-was-deja-vu-318561', '5766144', '180', '48000', 'audio/mpeg', 'unused', '1', '2025-05-12 13:22:26.985114', '5'),
('12', '1747030947088-let-it-go-12279.mp3', 'let-it-go-12279', '4274050', '134', '44100', 'audio/mpeg', 'unused', '1', '2025-05-12 13:22:27.157647', '5'),
('4', '1747030595913-let-it-go-12279.mp3', 'let-it-go-12279', '4274050', '134', '44100', 'audio/mpeg', 'unused', '1', '2025-05-12 13:16:35.964232', '3'),
('13', '1747041023028-nimbus-120-bpm-dj-333380.mp3', 'nimbus-120-bpm-dj-333380', '3666432', '115', '48000', 'audio/mpeg', 'unused', '1', '2025-05-12 16:10:23.128282', '2');


--
-- TOC entry 5041 (class 0 OID 16948)
-- Dependencies: 241
-- Data for Name: audio_groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.audio_groups (id, name, frequency) VALUES
('1', 'greetings', '1'),
('2', 'promotions', '1'),
('3', 'tips', '1'),
('4', 'announcements', '1'),
('5', 'music', '1');


--
-- TOC entry 5022 (class 0 OID 16765)
-- Dependencies: 222
-- Data for Name: broadcast_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 5024 (class 0 OID 16773)
-- Dependencies: 224
-- Data for Name: broadcast_programs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 5026 (class 0 OID 16783)
-- Dependencies: 226
-- Data for Name: communes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.communes (id, name, province_id) VALUES
('1', 'Cầu Giấy', '1'),
('2', 'Ba Đình', '1'),
('3', 'Hồng Bàng', '2'),
('4', 'Ngô Quyền', '2'),
('5', 'Yên Dũng', '3'),
('6', 'Lục Nam', '3'),
('7', 'Hải Châu', '4'),
('8', 'Thanh Khê', '4'),
('9', 'Tam Kỳ', '5'),
('10', 'Hội An', '5'),
('11', 'Hương Thủy', '6'),
('12', 'Phú Vang', '6'),
('13', 'Quận 1', '7'),
('14', 'Quận 7', '7'),
('15', 'Ninh Kiều', '8'),
('16', 'Cái Răng', '8'),
('17', 'Long Thành', '9'),
('18', 'Biên Hòa', '9');


--
-- TOC entry 5028 (class 0 OID 16792)
-- Dependencies: 228
-- Data for Name: playlists; Type: TABLE DATA; Schema: public; Owner: postgres
--




--
-- TOC entry 5030 (class 0 OID 16802)
-- Dependencies: 230
-- Data for Name: provinces; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.provinces (id, name, region_id) VALUES
('1', 'Hà Nội', '1'),
('2', 'Hải Phòng', '1'),
('3', 'Bắc Giang', '1'),
('4', 'Đà Nẵng', '2'),
('5', 'Quảng Nam', '2'),
('6', 'Huế', '2'),
('7', 'TP. Hồ Chí Minh', '3'),
('8', 'Cần Thơ', '3'),
('9', 'Đồng Nai', '3');


--
-- TOC entry 5032 (class 0 OID 16811)
-- Dependencies: 232
-- Data for Name: regions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.regions (id, name, code) VALUES
('1', 'Miền Bắc', 'north'),
('2', 'Miền Trung', 'central'),
('3', 'Miền Nam', 'south');


--
-- TOC entry 5037 (class 0 OID 16911)
-- Dependencies: 237
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.session (sid, sess, expire) VALUES
('F0grmUOgZDjmBeLObSUWJcnoCVQw6PzM', '{"cookie":{"originalMaxAge":86400000,"expires":"2025-05-13T07:48:37.224Z","httpOnly":true,"path":"/"},"passport":{"user":1}}', '2025-05-13 16:11:23');


--
-- TOC entry 5039 (class 0 OID 16922)
-- Dependencies: 239
-- Data for Name: supermarket_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.supermarket_types (id, name, display_name) VALUES
('1', 'general', 'Siêu thị lớn'),
('2', 'mini', 'Siêu thị mini'),
('3', 'hyper', 'Siêu thị hyper');


--
-- TOC entry 5034 (class 0 OID 16822)
-- Dependencies: 234
-- Data for Name: supermarkets; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.supermarkets (id, name, address, commune_id, province_id, region_id, status, current_program, created_at, supermarket_type_id) VALUES
('1', 'BIG C', '904 Nguyễn Kiệm', '1', '1', '1', 'active', NULL, '2025-05-12 15:10:36.247938', '1'),
('2', 'Siêu thị Mẫu Hà Nội', 'Số 123 Đường Lý Thường Kiệt', '1', '1', '1', 'active', NULL, '2025-05-12 15:24:07.80725', '1'),
('3', 'Siêu thị Mẫu TP.HCM', 'Số 456 Đường Lê Lợi', '13', '7', '3', 'active', NULL, '2025-05-12 15:24:07.817617', '3'),
('4', 'Siêu thị Mẫu Đà Nẵng', 'Số 789 Đường Nguyễn Văn Linh', '7', '4', '2', 'active', NULL, '2025-05-12 15:24:07.821158', '1'),
('5', 'Siêu thị Mẫu Hải Phòng', 'Số 101 Đường Lạch Tray', '3', '2', '1', 'active', NULL, '2025-05-12 15:24:07.823583', '2'),
('6', 'Siêu thị Mẫu Biên Hòa', 'Số 21 Điện Biên Phủ', '18', '9', '3', 'active', NULL, '2025-05-12 15:24:07.825579', '2'),
('7', 'Siêu thị Mẫu Cần Thơ', 'Số 30 Đường 3/2', '16', '8', '3', 'active', NULL, '2025-05-12 15:24:07.827938', '1'),
('8', 'Siêu thị Mẫu Quảng Nam', 'Số 5 Đường Trần Phú', '10', '5', '2', 'active', NULL, '2025-05-12 15:24:07.831034', '2'),
('9', 'Siêu thị Mẫu Huế', 'Số 45 Đường Hùng Vương', '12', '6', '2', 'active', NULL, '2025-05-12 15:24:07.833408', '2'),
('10', 'Siêu thị Mẫu Bắc Giang', 'Số 67 Đường Lý Thái Tổ', '5', '3', '1', 'active', NULL, '2025-05-12 15:24:07.835587', '1'),
('11', 'Siêu thị Mẫu Đồng Nai', 'Số 88 Đường Trương Công Định', '17', '9', '3', 'active', NULL, '2025-05-12 15:24:07.837916', '3');


--
-- TOC entry 5036 (class 0 OID 16833)
-- Dependencies: 236
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.users (id, username, password, full_name, role, status, created_at) VALUES
('1', 'admin001', '8c3e9cde7807198693a264b145a59b85e5cb8c20d8c600ac9bfc1468449a060bede7b02dc1cc7ce1472e0bf2310602f857a03df0a85e4c75d12a5b9fdd04c3a2.766980696af997c1492e9c1233da2a89', 'Trần Minh Quang', 'admin', 'active', '2025-05-12 13:08:11.658546'),
('2', 'user001', 'fcd3ab2c4340edd5f3dd9e9fa189f28fa8e46be5bd25613fc367ffa581c4a0ce7102865b7e8abb9634393e7752908a323699dabeb3f664b02a3cef0032c27138.a8812ea15a2d2b3301e060f74eacf49c', 'Trần Minh Tâm', 'user', 'active', '2025-05-12 13:13:02.88368'),
('3', 'mag', '55ab4171bbe974928f501d7e4fd73047c6aa6a285183c67da8eaab61e276ec9a7de1a970f5d57e70a4be0e883dccfcacf999c8071b3f713e80d502243da178c6.24c83ca5a2da081bd03146d4fd699314', 'Trần Minh Đăng', 'manager', 'active', '2025-05-12 13:54:51.468374');


--
-- TOC entry 5059 (class 0 OID 0)
-- Dependencies: 217
-- Name: activity_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.activity_logs_id_seq', 41, true);


--
-- TOC entry 5060 (class 0 OID 0)
-- Dependencies: 219
-- Name: audio_files_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audio_files_id_seq', 13, true);


--
-- TOC entry 5061 (class 0 OID 0)
-- Dependencies: 240
-- Name: audio_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audio_groups_id_seq', 5, true);


--
-- TOC entry 5062 (class 0 OID 0)
-- Dependencies: 221
-- Name: broadcast_assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.broadcast_assignments_id_seq', 1, false);


--
-- TOC entry 5063 (class 0 OID 0)
-- Dependencies: 223
-- Name: broadcast_programs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.broadcast_programs_id_seq', 1, false);


--
-- TOC entry 5064 (class 0 OID 0)
-- Dependencies: 225
-- Name: communes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.communes_id_seq', 18, true);


--
-- TOC entry 5065 (class 0 OID 0)
-- Dependencies: 227
-- Name: playlists_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.playlists_id_seq', 1, false);


--
-- TOC entry 5066 (class 0 OID 0)
-- Dependencies: 229
-- Name: provinces_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.provinces_id_seq', 9, true);


--
-- TOC entry 5067 (class 0 OID 0)
-- Dependencies: 231
-- Name: regions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.regions_id_seq', 3, true);


--
-- TOC entry 5068 (class 0 OID 0)
-- Dependencies: 238
-- Name: supermarket_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.supermarket_types_id_seq', 3, true);


--
-- TOC entry 5069 (class 0 OID 0)
-- Dependencies: 233
-- Name: supermarkets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.supermarkets_id_seq', 11, true);


--
-- TOC entry 5070 (class 0 OID 0)
-- Dependencies: 235
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 3, true);


--
-- TOC entry 4826 (class 2606 OID 16752)
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 4828 (class 2606 OID 16763)
-- Name: audio_files audio_files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audio_files
    ADD CONSTRAINT audio_files_pkey PRIMARY KEY (id);


--
-- TOC entry 4854 (class 2606 OID 16958)
-- Name: audio_groups audio_groups_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audio_groups
    ADD CONSTRAINT audio_groups_name_unique UNIQUE (name);


--
-- TOC entry 4856 (class 2606 OID 16956)
-- Name: audio_groups audio_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audio_groups
    ADD CONSTRAINT audio_groups_pkey PRIMARY KEY (id);


--
-- TOC entry 4830 (class 2606 OID 16771)
-- Name: broadcast_assignments broadcast_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcast_assignments
    ADD CONSTRAINT broadcast_assignments_pkey PRIMARY KEY (id);


--
-- TOC entry 4832 (class 2606 OID 16781)
-- Name: broadcast_programs broadcast_programs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcast_programs
    ADD CONSTRAINT broadcast_programs_pkey PRIMARY KEY (id);


--
-- TOC entry 4834 (class 2606 OID 16790)
-- Name: communes communes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.communes
    ADD CONSTRAINT communes_pkey PRIMARY KEY (id);


--
-- TOC entry 4836 (class 2606 OID 16800)
-- Name: playlists playlists_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.playlists
    ADD CONSTRAINT playlists_pkey PRIMARY KEY (id);


--
-- TOC entry 4838 (class 2606 OID 16809)
-- Name: provinces provinces_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.provinces
    ADD CONSTRAINT provinces_pkey PRIMARY KEY (id);


--
-- TOC entry 4840 (class 2606 OID 16820)
-- Name: regions regions_code_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_code_unique UNIQUE (code);


--
-- TOC entry 4842 (class 2606 OID 16818)
-- Name: regions regions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_pkey PRIMARY KEY (id);


--
-- TOC entry 4850 (class 2606 OID 16935)
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- TOC entry 4852 (class 2606 OID 16929)
-- Name: supermarket_types supermarket_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supermarket_types
    ADD CONSTRAINT supermarket_types_pkey PRIMARY KEY (id);


--
-- TOC entry 4844 (class 2606 OID 16831)
-- Name: supermarkets supermarkets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supermarkets
    ADD CONSTRAINT supermarkets_pkey PRIMARY KEY (id);


--
-- TOC entry 4846 (class 2606 OID 16843)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4848 (class 2606 OID 16845)
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- TOC entry 4857 (class 2606 OID 16846)
-- Name: activity_logs activity_logs_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4858 (class 2606 OID 16969)
-- Name: audio_files audio_files_audio_group_id_audio_groups_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audio_files
    ADD CONSTRAINT audio_files_audio_group_id_audio_groups_id_fk FOREIGN KEY (audio_group_id) REFERENCES public.audio_groups(id);


--
-- TOC entry 4859 (class 2606 OID 16851)
-- Name: audio_files audio_files_uploaded_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audio_files
    ADD CONSTRAINT audio_files_uploaded_by_users_id_fk FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- TOC entry 4860 (class 2606 OID 16871)
-- Name: broadcast_assignments broadcast_assignments_assigned_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcast_assignments
    ADD CONSTRAINT broadcast_assignments_assigned_by_users_id_fk FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- TOC entry 4861 (class 2606 OID 16964)
-- Name: broadcast_assignments broadcast_assignments_broadcast_program_id_broadcast_programs_i; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcast_assignments
    ADD CONSTRAINT broadcast_assignments_broadcast_program_id_broadcast_programs_i FOREIGN KEY (broadcast_program_id) REFERENCES public.broadcast_programs(id);


--
-- TOC entry 4862 (class 2606 OID 16866)
-- Name: broadcast_assignments broadcast_assignments_playlist_id_playlists_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcast_assignments
    ADD CONSTRAINT broadcast_assignments_playlist_id_playlists_id_fk FOREIGN KEY (playlist_id) REFERENCES public.playlists(id);


--
-- TOC entry 4863 (class 2606 OID 16856)
-- Name: broadcast_assignments broadcast_assignments_supermarket_id_supermarkets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcast_assignments
    ADD CONSTRAINT broadcast_assignments_supermarket_id_supermarkets_id_fk FOREIGN KEY (supermarket_id) REFERENCES public.supermarkets(id);


--
-- TOC entry 4864 (class 2606 OID 16876)
-- Name: broadcast_programs broadcast_programs_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcast_programs
    ADD CONSTRAINT broadcast_programs_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 4865 (class 2606 OID 16881)
-- Name: communes communes_province_id_provinces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.communes
    ADD CONSTRAINT communes_province_id_provinces_id_fk FOREIGN KEY (province_id) REFERENCES public.provinces(id);


--
-- TOC entry 4866 (class 2606 OID 16886)
-- Name: playlists playlists_broadcast_program_id_broadcast_programs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.playlists
    ADD CONSTRAINT playlists_broadcast_program_id_broadcast_programs_id_fk FOREIGN KEY (broadcast_program_id) REFERENCES public.broadcast_programs(id);


--
-- TOC entry 4867 (class 2606 OID 16891)
-- Name: provinces provinces_region_id_regions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.provinces
    ADD CONSTRAINT provinces_region_id_regions_id_fk FOREIGN KEY (region_id) REFERENCES public.regions(id);


--
-- TOC entry 4868 (class 2606 OID 16896)
-- Name: supermarkets supermarkets_commune_id_communes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supermarkets
    ADD CONSTRAINT supermarkets_commune_id_communes_id_fk FOREIGN KEY (commune_id) REFERENCES public.communes(id);


--
-- TOC entry 4869 (class 2606 OID 16901)
-- Name: supermarkets supermarkets_province_id_provinces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supermarkets
    ADD CONSTRAINT supermarkets_province_id_provinces_id_fk FOREIGN KEY (province_id) REFERENCES public.provinces(id);


--
-- TOC entry 4870 (class 2606 OID 16906)
-- Name: supermarkets supermarkets_region_id_regions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supermarkets
    ADD CONSTRAINT supermarkets_region_id_regions_id_fk FOREIGN KEY (region_id) REFERENCES public.regions(id);


--
-- TOC entry 4871 (class 2606 OID 16941)
-- Name: supermarkets supermarkets_supermarket_type_id_supermarket_types_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supermarkets
    ADD CONSTRAINT supermarkets_supermarket_type_id_supermarket_types_id_fk FOREIGN KEY (supermarket_type_id) REFERENCES public.supermarket_types(id);


-- Completed on 2025-05-12 16:25:56

--
-- PostgreSQL database dump complete
--

